"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const CodeBlock = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    language?: string
    code: string
  }
>(({ language, code, className, ...props }, ref) => {
  const { toast } = useToast()
  const [hasCopied, setHasCopied] = React.useState(false)

  const copyToClipboard = React.useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setHasCopied(true)
      toast({
        title: "Kopiert!",
        description: "Der Code wurde in die Zwischenablage kopiert.",
      })
      setTimeout(() => setHasCopied(false), 2000)
    })
  }, [code, toast])

  return (
    <div
      ref={ref}
      className={cn(
        "relative my-4 flex flex-col overflow-hidden rounded-md border text-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 bg-muted/50 px-4 py-1.5">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {language}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={copyToClipboard}
        >
          {hasCopied ? (
            <Check className="text-green-500" />
          ) : (
            <Copy className="text-muted-foreground" />
          )}
          <span className="sr-only">Copy code</span>
        </Button>
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="text-wrap">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
})
CodeBlock.displayName = "CodeBlock"

export { CodeBlock }
