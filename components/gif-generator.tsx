"use client";

import { useState, useEffect } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, Sparkles, AlertCircle, LogIn, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { downloadGif, shareGif } from "@/lib/gif-actions";

interface SingleGifResult {
  url: string;
  keywords: string[];
  topic: string | null;
  reasoning: string;
  title: string;
  perspective: "emotional" | "literal" | "sarcastic";
}

interface MultiGifResult {
  results: SingleGifResult[];
  totalFound: number;
  requestedPerspectives: number;
  rateLimit?: {
    remaining: number;
    limit: number;
    reset: string;
  };
}

export function GifGenerator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<MultiGifResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const { user, isLoaded } = useUser();

  // Check if trial has been used on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const used = localStorage.getItem("trial_used");
      if (used === "true") {
        setTrialUsed(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    setError(null);
    setResult(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const resetDate = new Date(data.reset);
          setError(`Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
        } else {
          setError(data.error || "Something went wrong");
        }
        return;
      }

      setResult(data);

      // Mark trial as used for anonymous users
      if (!user && typeof window !== "undefined") {
        localStorage.setItem("trial_used", "true");
        setTrialUsed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  };


  // Check if user should see trial prompt
  const showTrialPrompt = !user && trialUsed && isLoaded;
  const canGenerate = user || (!user && !trialUsed);

  return (
    <div className="w-full max-w-6xl space-y-4">
      <div className="flex flex-col gap-4">
        {/* Rate limit counter for authenticated users */}
        {result?.rateLimit && user && (
          <div className="flex flex-col items-center justify-center gap-1">
            <p className="text-sm text-muted-foreground">
              {result.rateLimit.remaining} of {result.rateLimit.limit} generations remaining today
            </p>
          </div>
        )}

        {/* Trial used prompt for anonymous users */}
        {showTrialPrompt && (
          <Alert className="border-primary/50 bg-primary/5">
            <Image src="/ReactiGIF.svg" alt="ReactiGIF Logo" width={20} height={20} />
            <AlertDescription className="flex flex-col gap-3">
              <p className="text-base font-medium">
                🎉 Loved it? Sign in for 9 more generations today!
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>10 free generations per day</li>
                <li>Save your generation history</li>
                <li>Access your GIFs anytime</li>
              </ul>
              <SignInButton mode="modal">
                <Button className="w-full sm:w-auto">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In to Continue
                </Button>
              </SignInButton>
            </AlertDescription>
          </Alert>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            type="text"
            placeholder="Describe a situation or feeling..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending || !canGenerate}
            className="h-12 text-base"
          />
          {canGenerate ? (
            <Button
              type="submit"
              disabled={isPending || !input.trim()}
              className="h-12 px-6"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button type="button" className="h-12 px-6">
                <LogIn className="h-5 w-5" />
              </Button>
            </SignInButton>
          )}
        </form>

        {/* Show trial info for first-time anonymous users */}
        {!user && !trialUsed && isLoaded && !result && (
          <p className="text-center text-sm text-muted-foreground">
            Try it free! No sign-in required for your first generation.
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isPending && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Finding the perfect reaction...
          </p>
        </div>
      )}

      {result && !isPending && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Show partial results warning if applicable */}
          {result.totalFound < result.requestedPerspectives && (
            <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Found {result.totalFound} of {result.requestedPerspectives} perspectives.
                Some searches didn't return results.
              </AlertDescription>
            </Alert>
          )}

          {/* 3-column grid for GIFs (responsive: stacks on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.results.map((gif) => (
              <div key={gif.perspective} className="space-y-3">
                {/* Perspective label */}
                <div className="flex items-center justify-center">
                  <Badge
                    variant="outline"
                    className={
                      gif.perspective === "emotional"
                        ? "border-pink-500 text-pink-500 bg-pink-500/10 text-sm font-semibold uppercase tracking-wider"
                        : gif.perspective === "literal"
                        ? "border-blue-500 text-blue-500 bg-blue-500/10 text-sm font-semibold uppercase tracking-wider"
                        : "border-purple-500 text-purple-500 bg-purple-500/10 text-sm font-semibold uppercase tracking-wider"
                    }
                  >
                    {gif.perspective}
                  </Badge>
                </div>

                {/* GIF card */}
                <Card className="overflow-hidden shadow-lg">
                  <CardContent className="p-0">
                    <img
                      src={gif.url}
                      alt={gif.title}
                      className="w-full aspect-video object-cover"
                    />
                  </CardContent>
                </Card>

                {/* Keywords */}
                <div className="flex flex-wrap items-center gap-2 justify-center">
                  {gif.keywords.map((keyword) => (
                    <Badge key={keyword} variant="default" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {gif.topic && (
                    <Badge variant="outline" className="text-xs">
                      {gif.topic}
                    </Badge>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareGif(gif.url, gif.title, gif.perspective)}
                    className="flex-1"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadGif(gif.url, gif.title, gif.perspective)}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>

                {/* Reasoning */}
                <p className="text-xs text-muted-foreground italic text-center">
                  {gif.reasoning}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
