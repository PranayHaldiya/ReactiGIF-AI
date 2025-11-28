import { toast } from "sonner";

/**
 * Downloads a GIF file to the user's device
 */
export async function downloadGif(
  url: string,
  title: string,
  perspective: string
): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `reaction-${perspective}-${Date.now()}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: open in new tab
    window.open(url, "_blank");
  }
}

/**
 * Shares a GIF using the Web Share API with fallbacks
 * - Mobile/Modern browsers: Native share sheet with GIF file
 * - Desktop/Older browsers: Copies URL to clipboard
 */
export async function shareGif(
  url: string,
  title: string,
  perspective: string
): Promise<void> {
  try {
    // Check if Web Share API is supported
    if (navigator.share) {
      // Fetch the GIF as a blob
      const response = await fetch(url);
      const blob = await response.blob();

      // Create a File object from the blob
      const file = new File(
        [blob],
        `reaction-${perspective}-${Date.now()}.gif`,
        { type: "image/gif" }
      );

      // Check if files can be shared
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${perspective} Reaction GIF`,
          text: title || `Check out this ${perspective} reaction GIF!`,
        });

        toast.success("Shared successfully!", {
          description: "GIF shared to your chosen platform.",
        });
      } else {
        // Fallback: share URL only
        await navigator.share({
          title: `${perspective} Reaction GIF`,
          text: title || `Check out this ${perspective} reaction GIF!`,
          url: url,
        });

        toast.success("Link shared!", {
          description: "GIF link copied to share.",
        });
      }
    } else {
      // Fallback: Copy URL to clipboard
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!", {
        description: "GIF URL copied to clipboard. Paste it anywhere to share!",
      });
    }
  } catch (err) {
    // User cancelled or error occurred
    if (err instanceof Error && err.name !== "AbortError") {
      toast.error("Share failed", {
        description: "Could not share the GIF. Try downloading instead.",
      });
    }
  }
}

