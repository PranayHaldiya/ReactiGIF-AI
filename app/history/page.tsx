"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { format } from "date-fns";
import { downloadGif, shareGif } from "@/lib/gif-actions";

interface Generation {
  id: string;
  inputText: string;
  keywords: string[];
  topic: string | null;
  gifUrl: string;
  gifTitle: string;
  createdAt: string;
  perspective: string | null;
  generationGroupId: string | null;
}

interface GroupedGeneration {
  groupId: string;
  inputText: string;
  createdAt: string;
  gifs: Generation[];
}

export default function HistoryPage() {
  const [generations, setGenerations] = useState<GroupedGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/history?page=${page}&limit=12`);
      const data = await response.json();
      setGenerations(data.generations || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">ReactiGIF History</h1>
        <p className="text-muted-foreground">
          View all your past generation sessions
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : generations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No generations yet. Create your first GIF!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-6">
            {generations.map((group) => (
              <Card key={group.groupId} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Input text header */}
                  <div className="mb-4">
                    <p className="text-sm font-medium">{group.inputText}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(group.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>

                  {/* GIFs grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.gifs.map((gif) => (
                      <div key={gif.id} className="space-y-2">
                        {/* Perspective badge */}
                        {gif.perspective && (
                          <Badge
                            variant="outline"
                            className={
                              gif.perspective === "emotional"
                                ? "border-pink-500 text-pink-500 text-xs uppercase"
                                : gif.perspective === "literal"
                                ? "border-blue-500 text-blue-500 text-xs uppercase"
                                : "border-purple-500 text-purple-500 text-xs uppercase"
                            }
                          >
                            {gif.perspective}
                          </Badge>
                        )}

                        {/* GIF image */}
                        <img
                          src={gif.gifUrl}
                          alt={gif.gifTitle}
                          className="w-full aspect-video object-cover rounded-md"
                        />

                        {/* Keywords */}
                        <div className="flex flex-wrap gap-1">
                          {gif.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => shareGif(gif.gifUrl, gif.gifTitle, gif.perspective || "unknown")}
                            className="h-8 flex-1"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadGif(gif.gifUrl, gif.gifTitle, gif.perspective || "unknown")}
                            className="h-8 flex-1"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
