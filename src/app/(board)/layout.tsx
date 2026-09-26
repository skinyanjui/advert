import { BoardShell } from "@/components/board-shell"

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BoardShell />
      {children}
    </>
  )
}
