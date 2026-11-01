export interface PageContent {
  page_number: number;
  content: string;
}

export interface Chapter {
  id: string;
  type: 'chapter' | 'anexo' | 'preliminary';
  number?: number;
  title: string;
  start_page: number;
  end_page: number;
  total_pages: number;
  word_count: number;
  pages?: PageContent[];
}

export interface Manifest {
  book_title: string;
  audience: string;
  publisher: string;
  year: number;
  total_pages: number;
  total_chapters: number;
  total_anexos: number;
  total_glosario_terms: number;
  total_signals: number;
  chapters: Chapter[];
}

export interface GlosarioItem {
  id: string;
  term: string;
  definition: string;
}

export interface TrafficSign {
  id: string;
  name: string;
  category: 'Reglamentarias' | 'Advertencia de Peligro' | 'Informativas' | 'Transitorias' | string;
  page?: number;
}
