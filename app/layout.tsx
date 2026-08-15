import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "实验室摸鱼模拟器 · 毕业生存指南",
  description: "从假说到论文，随机生成你的研究生人生。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
