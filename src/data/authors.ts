/**
 * authors.ts — 文章署名人物（小傑爸／小傑媽）
 *
 * 對應 CMS 的「作者」欄位（public/admin/config.yml → blog.author）。
 * avatar 待圖片提供後填入實際路徑，目前 fallback 為圓形字母頭像。
 */

export type AuthorPersona = '小傑爸' | '小傑媽';

export const DEFAULT_AUTHOR_PERSONA: AuthorPersona = '小傑爸';

export const AUTHOR_PERSONAS: Record<AuthorPersona, { name: string; initial: string; avatar?: string }> = {
  小傑爸: { name: '小傑爸', initial: '爸', avatar: '/images/author-xiaojie-dad.jpg' },
  小傑媽: { name: '小傑媽', initial: '媽', avatar: '/images/author-xiaojie-mom.jpg' },
};

export function getAuthorPersona(author?: string | null) {
  return AUTHOR_PERSONAS[(author as AuthorPersona) ?? DEFAULT_AUTHOR_PERSONA] ?? AUTHOR_PERSONAS[DEFAULT_AUTHOR_PERSONA];
}
