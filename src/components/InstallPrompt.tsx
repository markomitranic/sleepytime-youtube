"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";

type Platform = "ios" | "android";

export function InstallPrompt() {
	const [isVisible, setIsVisible] = useState(false);
	const [platform, setPlatform] = useState<Platform | null>(null);
	const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

	useEffect(() => {
		const isStandalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			(navigator as unknown as { standalone?: boolean }).standalone === true;
		if (isStandalone) return;

		if (localStorage.getItem("installPromptDismissed") === "true") return;

		const ua = navigator.userAgent;
		const isIOS =
			/iPhone|iPad|iPod/.test(ua) &&
			/Safari/.test(ua) &&
			!/CriOS|FxiOS|EdgiOS/.test(ua);

		if (isIOS) {
			setPlatform("ios");
			const timer = setTimeout(() => setIsVisible(true), 5000);
			return () => clearTimeout(timer);
		}

		function handlePrompt(e: BeforeInstallPromptEvent) {
			e.preventDefault();
			deferredPrompt.current = e;
			setPlatform("android");
			setTimeout(() => setIsVisible(true), 3000);
		}

		window.addEventListener("beforeinstallprompt", handlePrompt);
		return () =>
			window.removeEventListener("beforeinstallprompt", handlePrompt);
	}, []);

	function handleDismiss() {
		localStorage.setItem("installPromptDismissed", "true");
		setIsVisible(false);
	}

	async function handleInstall() {
		if (!deferredPrompt.current) return;
		await deferredPrompt.current.prompt();
		await deferredPrompt.current.userChoice;
		deferredPrompt.current = null;
		handleDismiss();
	}

	if (!isVisible) return null;

	return (
		<div
			role="alert"
			aria-label="Install app prompt"
			className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border border-zinc-700 bg-zinc-900/95 p-4 shadow-lg backdrop-blur-sm"
		>
			{platform === "ios" ? (
				<>
					<p className="mb-1 text-sm font-medium text-zinc-200">
						Install SleepyTime
					</p>
					<p className="mb-3 text-sm text-zinc-400">
						Tap{" "}
						<Share className="inline-block h-4 w-4 align-text-bottom text-zinc-300" />{" "}
						then &ldquo;Add to Home Screen&rdquo; for the full experience.
					</p>
					<Button
						onClick={handleDismiss}
						size="sm"
						variant="ghost"
						className="w-full"
					>
						Got it
					</Button>
				</>
			) : (
				<>
					<p className="mb-1 text-sm font-medium text-zinc-200">
						Install SleepyTime
					</p>
					<p className="mb-3 text-sm text-zinc-400">
						Add to your home screen for the full experience.
					</p>
					<div className="flex gap-2">
						<Button onClick={handleInstall} size="sm" className="flex-1">
							<Download className="mr-1.5 h-4 w-4" />
							Install
						</Button>
						<Button
							onClick={handleDismiss}
							size="sm"
							variant="ghost"
							className="flex-1"
						>
							Not now
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
