import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Terms of Service — Sleepytime YouTube",
};

export default function TermsPage() {
	return (
		<main className="min-h-screen pt-[env(safe-area-inset-top)]">
			<div className="mx-auto max-w-2xl px-6 py-16 pb-32">
				<Link
					href="/"
					className="text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors duration-500"
				>
					&larr; Home
				</Link>

				<h1 className="font-(family-name:--font-lora) text-2xl font-normal tracking-wide text-foreground/80 mt-6">
					Terms of Service
				</h1>
				<p className="text-xs text-muted-foreground/40 mt-2">
					Last updated: March 15, 2026
				</p>

				<div className="mt-10 space-y-10">
					{/* Intro */}
					<p className="text-sm text-muted-foreground/70 leading-relaxed">
						Sleepytime YouTube is a free, open-source hobby project. Use it
						as-is. The{" "}
						<a
							href="https://github.com/markomitranic/sleepytime-youtube"
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
						>
							source code
						</a>{" "}
						is publicly available.
					</p>

					{/* Service description */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							What this app does
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							Sleepytime YouTube plays YouTube playlists one video at a time
							with sleep timer functionality. It is a client-side web
							application — your browser does the work, not our servers.
						</p>
					</section>

					{/* No warranty */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							No warranty
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							This application is provided &ldquo;as is&rdquo; without warranty
							of any kind, express or implied. We make no guarantees about
							availability, reliability, or fitness for any particular purpose.
							Use it at your own discretion.
						</p>
					</section>

					{/* User responsibilities */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Your responsibilities
						</h2>
						<ul className="list-disc list-inside text-sm text-muted-foreground/70 leading-relaxed space-y-1 pl-2">
							<li>
								Comply with{" "}
								<a
									href="https://www.youtube.com/t/terms"
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
								>
									YouTube&apos;s Terms of Service
								</a>{" "}
								when using this app
							</li>
							<li>You are responsible for the content in your own playlists</li>
							<li>
								Do not misuse the service or attempt to circumvent any
								limitations
							</li>
						</ul>
					</section>

					{/* Third-party */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Third-party services
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							This app relies on Google and YouTube APIs. Your use of those
							services is subject to{" "}
							<a
								href="https://policies.google.com/terms"
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
							>
								Google&apos;s Terms of Service
							</a>{" "}
							and{" "}
							<a
								href="https://www.youtube.com/t/terms"
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
							>
								YouTube&apos;s Terms of Service
							</a>
							.
						</p>
					</section>

					{/* Intellectual property */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Intellectual property
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							The application source code is available under its open-source
							license at{" "}
							<a
								href="https://github.com/markomitranic/sleepytime-youtube"
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
							>
								GitHub
							</a>
							. YouTube content played through this app remains the property of
							its respective creators.
						</p>
					</section>

					{/* Changes */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Changes
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							We may update these terms. Continued use of the application after
							changes constitutes acceptance of the updated terms.
						</p>
					</section>

					{/* Contact */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Contact
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							For questions, open an issue on{" "}
							<a
								href="https://github.com/markomitranic/sleepytime-youtube/issues"
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
							>
								GitHub
							</a>
							.
						</p>
					</section>
				</div>
			</div>
		</main>
	);
}
