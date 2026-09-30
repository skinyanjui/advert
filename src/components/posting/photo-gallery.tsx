"use client"

import { ImagePlus, GripVertical } from "lucide-react"
import { useRef, useState, type DragEvent } from "react"

import { Button } from "@/components/ui/button"
import { maxListingPhotos } from "@/lib/photos"
import { cn } from "@/lib/utils"

export function PostPhotoGallery({
  photos,
  invalid,
  onFiles,
  onRemove,
  onMove,
  onCover,
}: {
  photos: string[]
  invalid: boolean
  onFiles: (files: File[]) => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
  onCover: (index: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileDrag, setFileDrag] = useState(false)
  const [moving, setMoving] = useState<number | null>(null)

  function takeFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setFileDrag(false)
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length > 0) onFiles(files)
  }

  return (
    <div className="grid gap-3">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={`${index}-${photo.slice(0, 32)}`}
              draggable
              onDragStart={() => setMoving(index)}
              onDragEnd={() => setMoving(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                if (moving !== null && moving !== index) onMove(moving, index)
                setMoving(null)
              }}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border bg-muted",
                index === 0 && "col-span-2 sm:col-span-2",
                moving === index && "opacity-60",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur">
                <GripVertical className="size-3" aria-hidden="true" />
                {index === 0 ? "Cover" : "Drag to reorder"}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/65 to-transparent p-2">
                {index > 0 ? (
                  <Button type="button" size="sm" variant="secondary" className="h-7 rounded-full bg-background px-2 text-xs" onClick={() => onCover(index)}>
                    Make cover
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="secondary" className="ml-auto h-7 rounded-full bg-background px-2 text-xs" onClick={() => onRemove(index)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {photos.length < maxListingPhotos ? (
        <div
          className={cn("overflow-hidden rounded-2xl border border-dashed bg-muted/30", fileDrag ? "border-foreground bg-background" : "border-border", invalid && "border-destructive")}
          onDragOver={(event) => {
            event.preventDefault()
            if (moving === null) setFileDrag(true)
          }}
          onDragLeave={() => setFileDrag(false)}
          onDrop={takeFiles}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              onFiles(Array.from(event.target.files ?? []))
              event.target.value = ""
            }}
          />
          <button type="button" onClick={() => inputRef.current?.click()} className="flex h-32 w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50">
            <ImagePlus className="size-5" />
            <span>{photos.length === 0 ? "Add photos" : "Add more photos"}</span>
            <span className="text-xs">Select several at once or drop them here</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
