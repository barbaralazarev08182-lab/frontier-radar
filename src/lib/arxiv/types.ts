/**
 * arXiv API 类型定义（阶段 1.4）。
 *
 * 基于 export.arxiv.org/api/query 返回的 Atom XML（fast-xml-parser 解析后的结构）。
 * 命名空间前缀保留在键名中（如 "arxiv:primary_category"），
 * 属性解析使用空前缀（attributeNamePrefix: ""），如 category.term。
 */

/** Atom entry 中的作者 */
export interface ArxivAtomAuthor {
  name?: string;
}

/** Atom entry 中的 link 元素 */
export interface ArxivAtomLink {
  href?: string;
  rel?: string;
  type?: string;
  title?: string;
}

/** Atom category / arxiv:primary_category */
export interface ArxivAtomCategory {
  term?: string;
  scheme?: string;
}

/** 带属性的元素其文本位于 "#text" */
export interface ArxivAtomTextElement {
  "#text"?: string;
}

/** arXiv Atom entry（仅采集需要的字段） */
export interface ArxivAtomEntry {
  id?: string;
  title?: string;
  summary?: string;
  updated?: string;
  published?: string;
  author?: ArxivAtomAuthor | ArxivAtomAuthor[];
  link?: ArxivAtomLink | ArxivAtomLink[];
  category?: ArxivAtomCategory | ArxivAtomCategory[];
  "arxiv:primary_category"?: ArxivAtomCategory;
  "arxiv:comment"?: string | ArxivAtomTextElement;
  "arxiv:journal_ref"?: string | ArxivAtomTextElement;
  "arxiv:doi"?: string | ArxivAtomTextElement;
}

/** Atom feed 根 */
export interface ArxivAtomFeed {
  feed?: {
    entry?: ArxivAtomEntry | ArxivAtomEntry[];
    "opensearch:totalResults"?: string | number;
    "opensearch:startIndex"?: string | number;
    "opensearch:itemsPerPage"?: string | number;
  };
}

/** arXiv API 查询参数（search() 入参） */
export interface ArxivQueryParams {
  /** 查询表达式，如 "cat:cs.LG AND (abs:agent OR abs:agentic)" */
  searchQuery: string;
  start?: number;
  maxResults?: number;
  sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate";
  sortOrder?: "ascending" | "descending";
}

/** 一次查询的解析结果 */
export interface ArxivQueryResult {
  entries: ArxivAtomEntry[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
}
