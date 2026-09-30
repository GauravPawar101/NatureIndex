import Link from 'next/link';
import PageHero from '../components/PageHero';

export const metadata = {
    title: 'About — Nature Index',
    description:
        'An open, collaborative platform where scientists, activists, and nature enthusiasts unite to share conservation knowledge and drive action.',
};

/**
 * Medium's own "About" pages are a single 700px column of prose with a few
 * pull quotes and nothing else: no split hero, no photograph, no grid of
 * cards. Every section below is separated by a 1px rule.
 */
export default function AboutPage() {
    return (
        <div className="mx-auto max-w-[700px] px-5 pb-16 pt-10">
            <PageHero
                eyebrow="Who we are"
                title="A collective for conservation"
                description="We believe the greatest force for protecting our planet is shared knowledge — open, collaborative, and actionable."
            />

            <div className="prose-nature">
                <h2>Knowledge for action</h2>
                <p>
                    We provide an open, collaborative platform where scientists, activists
                    and nature enthusiasts unite to share crucial information, inspire
                    dialogue, and drive meaningful conservation action.
                </p>
                <p>
                    Nature Index was born from the idea that conservation cannot be confined
                    to labs and academic papers. It has to be accessible, collaborative, and
                    actionable for everyone who wishes to contribute to a sustainable future.
                </p>

                <h2>Our manifesto</h2>
                <p>
                    <strong>Truth and science.</strong> Effective conservation is built on
                    sound science and verifiable data. We champion rigorous research and
                    fact-based dialogue as the essential starting point for protecting the
                    planet.
                </p>
                <p>
                    <strong>Radical collaboration.</strong> Ecosystem challenges are too
                    large for any single organisation. We share knowledge freely and build
                    bridges between communities, scientists and policymakers.
                </p>
                <p>
                    <strong>Empowerment.</strong> Information without action remains inert.
                    We translate global insights into tangible tools so every person can
                    become an effective guardian of their natural world.
                </p>

                <blockquote>
                    We publish the parts that did not work too, because accountability is
                    the foundation of trust.
                </blockquote>

                <p>
                    Every project here is monitored with satellite imagery and
                    on-the-ground data, and the results are published openly. That
                    includes the null results and the corrections.
                </p>
            </div>

            <div className="mt-12 border-t border-[var(--line)] pt-8">
                <h2 className="display-3 mb-3">Join the conversation</h2>
                <p className="mb-6 text-[16px] leading-[1.5] text-[var(--ink-muted)]">
                    Read field reports, share your research, and connect with a global
                    community of conservation stewards.
                </p>
                <Link href="/blog" className="btn btn-primary">
                    Start reading
                </Link>
            </div>
        </div>
    );
}
