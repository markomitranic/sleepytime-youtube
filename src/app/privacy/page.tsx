import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Privacy Policy — Sleepytime YouTube",
};

export default function PrivacyPage() {
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
					Privacy Policy
				</h1>
				<p className="text-xs text-muted-foreground/40 mt-2">
					Last updated: March 15, 2026
				</p>

				<div className="mt-10 space-y-10">
					{/* Intro */}
					<p className="text-sm text-muted-foreground/70 leading-relaxed">
						Sleepytime YouTube is a free, open-source application. The{" "}
						<a
							href="https://github.com/markomitranic/sleepytime-youtube"
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
						>
							source code
						</a>{" "}
						is publicly available — you can verify every claim on this page
						yourself.
					</p>

					{/* What we access */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							What data we access
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							When you sign in with Google, we request access to:
						</p>
						<ul className="list-disc list-inside text-sm text-muted-foreground/70 leading-relaxed space-y-1 pl-2">
							<li>
								Your basic profile (name, email, avatar) — to show who is signed
								in
							</li>
							<li>Your YouTube playlists — to list and play them</li>
						</ul>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							If you use the app without signing in, no personal data is
							accessed.
						</p>
					</section>

					{/* Data table */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Data handling at a glance
						</h2>
						<div className="overflow-x-auto">
							<table className="w-full text-sm text-left">
								<thead>
									<tr className="border-b border-foreground/10">
										<th className="py-2 pr-4 text-muted-foreground/60 font-medium">
											Data
										</th>
										<th className="py-2 pr-4 text-muted-foreground/60 font-medium">
											Stored where
										</th>
										<th className="py-2 pr-4 text-muted-foreground/60 font-medium">
											Sent to
										</th>
										<th className="py-2 text-muted-foreground/60 font-medium">
											Retention
										</th>
									</tr>
								</thead>
								<tbody className="text-muted-foreground/70">
									<tr className="border-b border-foreground/5">
										<td className="py-2 pr-4">Name, email, avatar</td>
										<td className="py-2 pr-4">
											Encrypted session cookie (browser)
										</td>
										<td className="py-2 pr-4">Nobody</td>
										<td className="py-2">Until sign-out</td>
									</tr>
									<tr className="border-b border-foreground/5">
										<td className="py-2 pr-4">YouTube access token</td>
										<td className="py-2 pr-4">Encrypted session cookie</td>
										<td className="py-2 pr-4">YouTube API only</td>
										<td className="py-2">Until expiry or sign-out</td>
									</tr>
									<tr className="border-b border-foreground/5">
										<td className="py-2 pr-4">Current playlist &amp; video</td>
										<td className="py-2 pr-4">localStorage (browser)</td>
										<td className="py-2 pr-4">Nobody</td>
										<td className="py-2">Until you clear it</td>
									</tr>
									<tr className="border-b border-foreground/5">
										<td className="py-2 pr-4">Video playback progress</td>
										<td className="py-2 pr-4">localStorage (browser)</td>
										<td className="py-2 pr-4">Nobody</td>
										<td className="py-2">Auto-deleted after 7 days</td>
									</tr>
									<tr>
										<td className="py-2 pr-4">Analytics / tracking</td>
										<td className="py-2 pr-4 italic">Not collected</td>
										<td className="py-2 pr-4 italic">Nobody</td>
										<td className="py-2 italic">N/A</td>
									</tr>
								</tbody>
							</table>
						</div>
						<p className="text-xs text-muted-foreground/50 leading-relaxed">
							No server-side database. No tracking. All user data stays in your
							browser.
						</p>
					</section>

					{/* What we don't do */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							What we do not do
						</h2>
						<ul className="list-disc list-inside text-sm text-muted-foreground/70 leading-relaxed space-y-1 pl-2">
							<li>
								We do not store your data on our servers — there is no database
							</li>
							<li>
								We do not sell, share, or transfer your Google user data to any
								third party
							</li>
							<li>
								We do not use your data for advertising, profiling, or any
								purpose beyond playing your playlists
							</li>
						</ul>
					</section>

					{/* Google API compliance */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Google API Services
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							Our use of Google API data complies with the{" "}
							<a
								href="https://developers.google.com/terms/api-services-user-data-policy"
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
							>
								Google API Services User Data Policy
							</a>
							, including the Limited Use requirements. We access your YouTube
							data solely to provide the playlist playback functionality you
							request.
						</p>
					</section>

					{/* YouTube embeds */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							YouTube embeds
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							This app embeds YouTube videos using the YouTube IFrame Player.
							YouTube (Google) may set its own cookies when videos are loaded.
							These cookies are managed by YouTube, not by us. See{" "}
							<a
								href="https://policies.google.com/privacy"
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
							>
								Google&apos;s privacy policy
							</a>{" "}
							for details.
						</p>
					</section>

					{/* Cookies */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Cookies
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							The only cookie set by this app is an encrypted session cookie for
							authentication. It is strictly necessary for the sign-in feature
							and does not require consent under GDPR/ePrivacy regulations. We
							do not set any tracking, analytics, or advertising cookies.
						</p>
					</section>

					{/* GDPR */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Your rights (GDPR)
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							Since we do not store your data on any server, there is nothing to
							delete on our end. To revoke this app&apos;s access to your Google
							account:
						</p>
						<ol className="list-decimal list-inside text-sm text-muted-foreground/70 leading-relaxed space-y-1 pl-2">
							<li>
								Visit{" "}
								<a
									href="https://myaccount.google.com/permissions"
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
								>
									myaccount.google.com/permissions
								</a>
							</li>
							<li>Find &ldquo;Sleepytime YouTube&rdquo; and remove access</li>
						</ol>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							Your localStorage data can be cleared through your browser
							settings at any time.
						</p>
					</section>

					{/* Contact */}
					<section className="space-y-3">
						<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
							Contact
						</h2>
						<p className="text-sm text-muted-foreground/70 leading-relaxed">
							For questions about this policy, open an issue on{" "}
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
