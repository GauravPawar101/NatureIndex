// This module doubles as the engine's library surface. The per-user
// collaborative-filtering write-through and the hybrid ranking entry point
// below are complete and expected to run against a live database, but the
// binary is currently a scheduled batch job that only calls
// `compute_and_sync_pagerank`. They are kept — and kept compiling — for the
// serving path rather than deleted, so the dead-code lint is disabled here
// instead of as scattered `#[allow]`s on individual items.
#![allow(dead_code)]

use pgvector::Vector;
use std::{
    collections::{HashMap, HashSet},
    error::Error,
};
use tokio_postgres::{types::ToSql, Client as PgClient};

// ============================================================
// Data Structures
// ============================================================

#[derive(Debug, Clone)]
pub struct Edge {
    pub target: usize,
    pub weight: f64,
}

pub struct Graph {
    pub n: usize,
    pub adj: Vec<Vec<Edge>>,
    pub wt_sums: Vec<f64>,
}

impl Graph {
    pub fn new(n: usize) -> Self {
        Self {
            n,
            adj: vec![Vec::new(); n],
            wt_sums: vec![0.0; n],
        }
    }

    pub fn add_edge(&mut self, src: usize, tgt: usize, wt: f64) {
        self.adj[src].push(Edge {
            target: tgt,
            weight: wt,
        });
        self.wt_sums[src] += wt;
    }

    pub fn compute_rank(&self, alpha: f64, tol: f64, max_iter: usize) -> Vec<f64> {
        let n = self.n;
        if n == 0 {
            return Vec::<f64>::new();
        }
        let init_rank: f64 = 1.0 / (n as f64);
        let mut ranks = vec![init_rank; n];
        let mut nxt_ranks = vec![0.0; n];
        let base_score = (1.0 - alpha) / (n as f64);

        for iter in 0..max_iter {
            nxt_ranks.fill(base_score);

            // Dangling nodes (no outbound edges) redistribute their rank
            // uniformly, which is what keeps the total rank mass conserved.
            let dangling_sum: f64 = self
                .wt_sums
                .iter()
                .zip(ranks.iter())
                .filter(|(out_sum, _)| **out_sum == 0.0)
                .map(|(_, rank)| *rank)
                .sum();
            let dangling_contrib = alpha * (dangling_sum / (n as f64));

            for (u, out_sum) in self.wt_sums.iter().enumerate() {
                if *out_sum > 0.0 {
                    let rank_contrib = alpha * (ranks[u] / out_sum);
                    for edge in &self.adj[u] {
                        nxt_ranks[edge.target] += rank_contrib * edge.weight;
                    }
                }
            }

            for r in nxt_ranks.iter_mut() {
                *r += dangling_contrib;
            }

            let mut l1_diff = 0.0;
            for i in 0..n {
                l1_diff += (ranks[i] - nxt_ranks[i]).abs();
            }
            ranks.copy_from_slice(&nxt_ranks);

            if l1_diff < tol {
                println!(
                    "Converged in {} iterations (diff: {:.2e})",
                    iter + 1,
                    l1_diff
                );
                break;
            }
        }
        ranks
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ALPHA: f64 = 0.85;
    const TOL: f64 = 1e-10;
    const MAX_ITER: usize = 500;

    fn sum(ranks: &[f64]) -> f64 {
        ranks.iter().sum()
    }

    #[test]
    fn empty_graph_yields_no_ranks() {
        assert!(Graph::new(0).compute_rank(ALPHA, TOL, MAX_ITER).is_empty());
    }

    /// The defining property of PageRank: total rank mass is conserved. If
    /// this drifts, the persisted `pr_score` column stops being comparable
    /// between runs and the recommendations ranking becomes meaningless.
    #[test]
    fn total_rank_mass_is_conserved() {
        let mut g = Graph::new(4);
        g.add_edge(0, 1, 1.0);
        g.add_edge(1, 2, 2.0);
        g.add_edge(2, 3, 1.0);
        // node 3 is dangling — no outbound edges.
        let ranks = g.compute_rank(ALPHA, TOL, MAX_ITER);
        assert!(
            (sum(&ranks) - 1.0).abs() < 1e-9,
            "rank mass should stay ~1.0, got {}",
            sum(&ranks)
        );
    }

    #[test]
    fn dangling_nodes_do_not_lose_their_rank() {
        // Every node is dangling, so nothing can flow anywhere. All rank must
        // still be redistributed uniformly rather than draining to zero.
        let mut g = Graph::new(5);
        for i in 0..5 {
            g.add_edge(i, i, 0.0);
        }
        let ranks = g.compute_rank(ALPHA, TOL, MAX_ITER);
        assert!((sum(&ranks) - 1.0).abs() < 1e-9);
        for (i, r) in ranks.iter().enumerate() {
            assert!(
                (r - 0.2).abs() < 1e-6,
                "node {} should hold an equal share, got {}",
                i,
                r
            );
        }
    }

    /// A post that many others link to must outrank a leaf. This is the whole
    /// reason the engine exists, so it is worth pinning down.
    #[test]
    fn heavily_linked_node_outranks_a_leaf() {
        let mut g = Graph::new(4);
        g.add_edge(1, 0, 1.0);
        g.add_edge(2, 0, 1.0);
        g.add_edge(3, 0, 1.0);
        g.add_edge(0, 1, 1.0);
        let ranks = g.compute_rank(ALPHA, TOL, MAX_ITER);
        assert!(
            ranks[0] > ranks[1] && ranks[0] > ranks[2] && ranks[0] > ranks[3],
            "hub (node 0) should rank highest, got {:?}",
            ranks
        );
    }

    /// Symmetric graphs must produce symmetric ranks — a cheap way to catch an
    /// indexing mistake in the edge-accumulation loop.
    #[test]
    fn symmetric_graph_yields_uniform_ranks() {
        let mut g = Graph::new(3);
        g.add_edge(0, 1, 1.0);
        g.add_edge(1, 2, 1.0);
        g.add_edge(2, 0, 1.0);
        let ranks = g.compute_rank(ALPHA, TOL, MAX_ITER);
        for r in &ranks {
            assert!(
                (r - 1.0 / 3.0).abs() < 1e-6,
                "expected uniform, got {:?}",
                ranks
            );
        }
    }

    #[test]
    fn edge_weights_bias_the_distribution() {
        // Node 0 splits its rank across two outbound edges, so the *relative*
        // weight between them is what decides the split. Scaling a lone edge
        // changes nothing, because all of a node's rank flows along it either
        // way — the weight only matters against a competing edge.
        let mut even = Graph::new(3);
        even.add_edge(0, 1, 1.0);
        even.add_edge(0, 2, 1.0);
        even.add_edge(2, 0, 1.0);

        let mut skewed = Graph::new(3);
        skewed.add_edge(0, 1, 5.0);
        skewed.add_edge(0, 2, 1.0);
        skewed.add_edge(2, 0, 1.0);

        let even_ranks = even.compute_rank(ALPHA, TOL, MAX_ITER);
        let skewed_ranks = skewed.compute_rank(ALPHA, TOL, MAX_ITER);

        assert!(
            skewed_ranks[1] > even_ranks[1],
            "favouring the 0->1 edge should raise node 1: skewed={:?} even={:?}",
            skewed_ranks,
            even_ranks
        );
        assert!(
            skewed_ranks[2] < even_ranks[2],
            "and correspondingly lower node 2: skewed={:?} even={:?}",
            skewed_ranks,
            even_ranks
        );
    }

    #[test]
    fn respects_max_iterations() {
        let mut g = Graph::new(30);
        for i in 0..30 {
            g.add_edge(i, (i + 1) % 30, 1.0);
        }
        // One iteration cannot converge a 30-cycle, so the caller-supplied cap
        // is what bounds the work; the result must still be a valid vector.
        let ranks = g.compute_rank(ALPHA, 0.0, 1);
        assert_eq!(ranks.len(), 30);
        assert!(ranks.iter().all(|r| r.is_finite() && *r >= 0.0));
    }

    #[test]
    fn converged_result_is_stable_across_repeat_runs() {
        let mut g = Graph::new(6);
        for i in 0..6 {
            g.add_edge(i, (i + 2) % 6, 1.0);
            g.add_edge(i, (i + 3) % 6, 1.0);
        }
        let first = g.compute_rank(ALPHA, TOL, MAX_ITER);
        let second = g.compute_rank(ALPHA, TOL, MAX_ITER);
        for (a, b) in first.iter().zip(second.iter()) {
            assert!((a - b).abs() < 1e-12, "compute_rank must be deterministic");
        }
    }
}

#[derive(Debug)]
pub struct CandidatePost {
    pub post_id: String,
    pub vector_score: f64,
    pub cf_score: f64,
    pub pagerank_score: f64,
    pub final_score: f64,
}

// ============================================================
// Recommendation Pipeline & Write-Through Operations
// ============================================================

/// Computes PageRank across graph interactions and executes a write-through
/// to Redis first, then persists directly into PostgreSQL.
pub async fn compute_and_sync_pagerank(
    pg_client: &PgClient,
    redis_conn: &mut redis::aio::ConnectionManager,
) -> Result<(), Box<dyn Error>> {
    let post_rows = pg_client
        .query("SELECT id::text FROM public.posts", &[])
        .await?;

    let mut map: HashMap<String, usize> = HashMap::new();
    let mut idx_node: Vec<String> = Vec::new();
    for row in &post_rows {
        let post_id: String = row.get(0);
        if !map.contains_key(&post_id) {
            map.insert(post_id.clone(), idx_node.len());
            idx_node.push(post_id);
        }
    }

    let n = idx_node.len();
    let mut graph = Graph::new(n);

    let interaction_rows = pg_client
        .query(
            "SELECT source_post_id::text, target_post_id::text, weight FROM public.interaction",
            &[],
        )
        .await?;

    for row in interaction_rows {
        let sid: String = row.get(0);
        let tid: String = row.get(1);
        let w: f64 = row.get(2);
        if let (Some(&u), Some(&v)) = (map.get(&sid), map.get(&tid)) {
            graph.add_edge(u, v, w);
        }
    }

    println!("Computing PageRank for {} nodes...", n);
    let ranks = graph.compute_rank(0.85, 1e-5, 50);

    // 1. Write-Through Step 1: Redis Cache
    println!("Writing PageRank to Redis...");
    const CHUNK_SIZE: usize = 500;
    for chunk in idx_node
        .iter()
        .zip(ranks.iter())
        .collect::<Vec<_>>()
        .chunks(CHUNK_SIZE)
    {
        let mut pipe = redis::pipe();
        for (post_id, score) in chunk {
            pipe.cmd("HSET")
                .arg("pagerank::scores")
                .arg(*post_id)
                .arg(score.to_string())
                .ignore();
        }
        let _: () = pipe.query_async(redis_conn).await?;
    }

    // 2. Write-Through Step 2: Database Persistence
    println!("Writing-through PageRank to PostgreSQL...");
    let post_uuids: Vec<uuid::Uuid> = idx_node
        .iter()
        .map(|id| uuid::Uuid::parse_str(id).expect("Invalid UUID"))
        .collect();

    // FIX: the original query did
    //   UNNEST($1::uuid[], $2::float8[], ARRAY[now()]::timestamptz[])
    // $1 and $2 are length-n arrays but ARRAY[now()] is length 1 — when
    // UNNEST-ing multiple arrays of different lengths, Postgres pads the
    // shorter ones with NULL. Every row past the first therefore got
    // updated_at = NULL, which violates the "not null" constraint and
    // aborts the whole insert as soon as there's more than one post.
    // Calling now() per-row in the SELECT (as write_through_cf_scores
    // already does) avoids the array-length mismatch entirely.
    pg_client
        .execute(
            "INSERT INTO public.pagerank_scores (post_id, pr_score, updated_at)
             SELECT unnest_p, unnest_s, now()
             FROM UNNEST($1::uuid[], $2::float8[]) AS t(unnest_p, unnest_s)
             ON CONFLICT (post_id) DO UPDATE SET
                pr_score = EXCLUDED.pr_score,
                updated_at = EXCLUDED.updated_at;",
            &[
                &post_uuids as &(dyn ToSql + Sync),
                &ranks as &(dyn ToSql + Sync),
            ],
        )
        .await?;

    Ok(())
}

/// Helper function to perform write-through for Collaborative Filtering scores.
pub async fn write_through_cf_scores(
    pg_client: &PgClient,
    redis_conn: &mut redis::aio::ConnectionManager,
    user_id: &str,
    scores: &[(String, f64)],
) -> Result<(), Box<dyn Error>> {
    let cf_key = format!("cf:user:{}", user_id);

    // 1. Write to Cache (Redis)
    let mut pipe = redis::pipe();
    for (post_id, score) in scores {
        pipe.cmd("ZADD")
            .arg(&cf_key)
            .arg(*score)
            .arg(post_id)
            .ignore();
    }
    let _: () = pipe.query_async(redis_conn).await?;

    // 2. Write-through to DB (PostgreSQL)
    let user_uuid = uuid::Uuid::parse_str(user_id)?;
    let post_uuids: Result<Vec<uuid::Uuid>, _> = scores
        .iter()
        .map(|(id, _)| uuid::Uuid::parse_str(id))
        .collect();
    let post_uuids = post_uuids?;
    let score_vals: Vec<f64> = scores.iter().map(|(_, s)| *s).collect();

    pg_client
        .execute(
            "INSERT INTO public.cf_user_scores (user_id, post_id, cf_score, updated_at)
             SELECT $1, unnest_p, unnest_s, now()
             FROM UNNEST($2::uuid[], $3::float8[]) AS t(unnest_p, unnest_s)
             ON CONFLICT (user_id, post_id) DO UPDATE SET
                cf_score = EXCLUDED.cf_score,
                updated_at = EXCLUDED.updated_at;",
            &[
                &user_uuid,
                &post_uuids as &(dyn ToSql + Sync),
                &score_vals as &(dyn ToSql + Sync),
            ],
        )
        .await?;

    Ok(())
}

/// Ranks candidate posts combining Vector, Collaborative Filtering, and PageRank scores.
// Three separate weights (alpha/beta/gamma) plus the tuning parameters is what
// makes the blend explicit and tunable; bundling them into a config struct
// would only move the same eight values somewhere else.
#[allow(clippy::too_many_arguments)]
pub async fn get_recommendations(
    pg_client: &PgClient,
    redis_conn: &mut redis::aio::ConnectionManager,
    user_id: &str,
    user_interest_vector: Vec<f32>,
    candidate_limit: i64,
    alpha: f64,
    beta: f64,
    gamma: f64,
) -> Result<Vec<CandidatePost>, Box<dyn Error>> {
    // 1. Vector Search Query
    // Requires the match_posts(vector, int) function defined in the schema —
    // it wraps the "<=>" cosine-distance operator over posts.embedding.
    let pg_vector = Vector::from(user_interest_vector);
    let rows = pg_client
        .query(
            "SELECT id::text, similarity FROM match_posts($1, $2)",
            &[&pg_vector, &(candidate_limit as i32)],
        )
        .await?;

    let mut vector_scores: HashMap<String, f64> = HashMap::new();
    for row in rows {
        let id: String = row.get("id");
        let sim: f64 = row.get("similarity");
        vector_scores.insert(id, sim);
    }

    // 2. Fetch Collaborative Filtering scores from Redis Cache
    let cf_key = format!("cf:user:{}", user_id);
    let cf_raw: Vec<(String, f64)> = redis::cmd("ZREVRANGE")
        .arg(&cf_key)
        .arg(0)
        .arg(candidate_limit - 1)
        .arg("WITHSCORES")
        .query_async(redis_conn)
        .await
        .unwrap_or_default();

    let mut cf_scores: HashMap<String, f64> = HashMap::new();
    for (post_id, score) in cf_raw {
        cf_scores.insert(post_id, score);
    }

    // 3. Union candidate set IDs
    let mut candidate_set: HashSet<String> = HashSet::new();
    candidate_set.extend(vector_scores.keys().cloned());
    candidate_set.extend(cf_scores.keys().cloned());
    let candidate_ids: Vec<String> = candidate_set.into_iter().collect();

    if candidate_ids.is_empty() {
        return Ok(Vec::new());
    }

    // 4. Batch query PageRank scores from Redis
    let pg_raw_scores: Vec<Option<String>> = redis::cmd("HMGET")
        .arg("pagerank::scores")
        .arg(&candidate_ids)
        .query_async(redis_conn)
        .await?;

    // 5. Combine scores
    let mut candidates: Vec<CandidatePost> = Vec::new();
    for (idx, post_id) in candidate_ids.into_iter().enumerate() {
        let vscore = vector_scores.get(&post_id).copied().unwrap_or(0.0);
        let cscore = cf_scores.get(&post_id).copied().unwrap_or(0.0);
        let pr_score = pg_raw_scores
            .get(idx)
            .and_then(|opt| opt.as_ref())
            .and_then(|val| val.parse::<f64>().ok())
            .unwrap_or(0.0);

        let final_score = (alpha * vscore) + (beta * cscore) + (gamma * pr_score);

        candidates.push(CandidatePost {
            post_id,
            vector_score: vscore,
            cf_score: cscore,
            pagerank_score: pr_score,
            final_score,
        });
    }

    candidates.sort_by(|a, b| b.final_score.partial_cmp(&a.final_score).unwrap());
    Ok(candidates)
}
