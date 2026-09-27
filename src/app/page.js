import Link from 'next/link';
import { ChevronRight, Leaf, Globe, Users, ArrowDown } from 'lucide-react';

export default function HomePage() {
    return (
        <>
            {/* Hero. The photograph is the ground the whole page sits on, so it
                does not need its own scrim here — the global .ground layer and
                its --scrim already do that work, and stacking a second
                gradient on top was what made this read as a dark slab. */}
            <section className="relative flex min-h-[86vh] flex-col items-center justify-center px-6 text-center">
                <div className="relative z-10 mx-auto max-w-3xl">
                    <span className="eyebrow mb-6 block">Conservation science, published in the open</span>
                    <h1 className="display-1 mb-6 text-[var(--ink)]">
                        Field reports from the people doing the work
                    </h1>
                    <p className="lede mx-auto mb-10">
                        Research, monitoring and hard-won field notes on the ecosystems
                        that keep us alive. Written by scientists and stewards, published
                        without a paywall.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link href="/blog" className="btn btn btn-primary group">
                            Read the field journal
                            <ChevronRight
                                size={16}
                                className="transition-transform group-hover:translate-x-1"
                                aria-hidden="true"
                            />
                        </Link>
                        <Link href="/discover" className="btn btn btn-secondary">
                            See what is trending
                        </Link>
                    </div>
                </div>

                <a
                    href="#initiatives"
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
                    aria-label="Scroll to initiatives"
                >
                    <ArrowDown size={20} aria-hidden="true" />
                </a>
            </section>

            <section id="initiatives" className="py-20 lg:py-28">
                <div className="container-page">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="eyebrow mb-4 block">What we do</span>
                        <h2 className="display-2 mb-4 text-[var(--ink)]">
                            Three things, taken seriously
                        </h2>
                        <p className="lede mx-auto">
                            Every action we take is guided by science, powered by
                            communities, and aimed at lasting ecological impact.
                        </p>
                    </div>

                    <div className="mt-14 grid gap-6 md:grid-cols-3">
                        {[
                            {
                                Icon: Leaf,
                                title: 'Habitat restoration',
                                desc: 'We document and support reforestation and ecosystem recovery projects that rebuild habitat for wildlife and the people who live alongside it.',
                            },
                            {
                                Icon: Globe,
                                title: 'Climate science',
                                desc: 'Our contributors publish evidence-based research and field reporting that informs policy and public understanding of the climate crisis.',
                            },
                            {
                                Icon: Users,
                                title: 'Community programmes',
                                desc: 'We connect local stewards with a global audience, giving the communities doing the work ownership of the outcomes they produce.',
                            },
                        ].map(({ Icon, title, desc }) => (
                            <div key={title} className="glass glass-hover p-7">
                                <Icon size={26} className="mb-5 text-[var(--accent)]" aria-hidden="true" />
                                <h3 className="display-3 mb-3 text-[var(--ink)]">{title}</h3>
                                <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="about" className="py-20 lg:py-28">
                <div className="container-page">
                    {/* Framed as a pull-quote rather than a two-column split over a
                        photograph. The old version put a gradient over an
                        external image to make text legible, which is a worse way
                        to achieve the same thing than a glass panel. */}
                    <div className="glass mx-auto max-w-3xl p-8 md:p-12">
                        <span className="eyebrow mb-4 block">Our story</span>
                        <h2 className="display-2 mb-6 text-[var(--ink)]">
                            Science-led. Community-driven.
                        </h2>
                        <p className="measure mb-5 leading-relaxed">
                            Nature Index is a collective of ecologists, conservationists and
                            storytellers building open knowledge for environmental action.
                        </p>
                        <p className="measure mb-8 leading-relaxed">
                            Every project is monitored with satellite imagery and on-the-ground
                            data. We publish the results openly, including the parts that did
                            not work, because accountability is the foundation of trust.
                        </p>
                        <Link href="/about" className="btn btn btn-primary group">
                            Learn about us
                            <ChevronRight
                                size={16}
                                className="transition-transform group-hover:translate-x-1"
                                aria-hidden="true"
                            />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="pb-24">
                <div className="container-page">
                    <div className="glass mx-auto max-w-3xl p-8 text-center md:p-12">
                        <h2 className="display-2 mb-4 text-[var(--ink)]">
                            Read something useful
                        </h2>
                        <p className="lede mx-auto mb-8">
                            Seventeen field reports, photographed surveys and monitoring
                            records — searchable by meaning, not just by keyword.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link href="/blog" className="btn btn btn-primary">
                                Browse the journal
                            </Link>
                            <Link href="/media" className="btn btn btn-secondary">
                                Photos and video
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
