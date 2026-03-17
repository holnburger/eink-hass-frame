"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type EspWebInstallButtonProps = {
  manifest: string;
  onDetectedDeviceUrl?: (url: string) => void;
};

type InstallDialogLike = HTMLElement & {
  _client?: {
    nextUrl?: string;
  };
};

export function UsbInstallButton({
  manifest,
  onDetectedDeviceUrl,
}: EspWebInstallButtonProps) {
  const lastUrlRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    void import("esp-web-tools").catch((error) => {
      if (!cancelled) {
        console.error("Failed to load esp-web-tools", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!onDetectedDeviceUrl || typeof window === "undefined") {
      return;
    }

    const connectedDialogs = new WeakSet<InstallDialogLike>();

    const attachToDialog = (dialog: InstallDialogLike) => {
      if (connectedDialogs.has(dialog)) {
        return;
      }
      connectedDialogs.add(dialog);

      const emitNextUrl = () => {
        const nextUrl = dialog._client?.nextUrl?.trim();
        if (!nextUrl || nextUrl === lastUrlRef.current) {
          return;
        }
        lastUrlRef.current = nextUrl;
        onDetectedDeviceUrl(nextUrl);
      };

      const pollId = window.setInterval(emitNextUrl, 500);
      dialog.addEventListener(
        "closed",
        () => {
          emitNextUrl();
          window.clearInterval(pollId);
        },
        { once: true },
      );
      emitNextUrl();
    };

    document.querySelectorAll("ewt-install-dialog").forEach((node) => {
      attachToDialog(node as unknown as InstallDialogLike);
    });

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }
          if (node.tagName.toLowerCase() === "ewt-install-dialog") {
            attachToDialog(node as unknown as InstallDialogLike);
          }
        });
      }
    });

    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, [onDetectedDeviceUrl]);

  return (
    <esp-web-install-button manifest={manifest}>
      <Button
        slot="activate"
        type="button"
      >
        Flash & Configure via USB
      </Button>
      <span slot="unsupported" className="text-xs text-zinc-500">
        WebSerial requires Chrome or Edge.
      </span>
      <span slot="not-allowed" className="text-xs text-zinc-500">
        Open this app on `https://` or `localhost` to use USB flashing.
      </span>
    </esp-web-install-button>
  );
}
