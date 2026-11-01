import intro from './chapters/intro.json';
import cap1 from './chapters/cap-1.json';
import cap2 from './chapters/cap-2.json';
import cap3 from './chapters/cap-3.json';
import cap4 from './chapters/cap-4.json';
import cap5 from './chapters/cap-5.json';
import cap6 from './chapters/cap-6.json';
import cap7 from './chapters/cap-7.json';
import cap8 from './chapters/cap-8.json';
import cap9 from './chapters/cap-9.json';
import anexo1 from './chapters/anexo-1.json';
import anexo2 from './chapters/anexo-2.json';
import anexo3 from './chapters/anexo-3.json';
import { Chapter } from '../types/content';

export const allChapters: Record<string, Chapter> = {
  'intro': intro as unknown as Chapter,
  'cap-1': cap1 as unknown as Chapter,
  'cap-2': cap2 as unknown as Chapter,
  'cap-3': cap3 as unknown as Chapter,
  'cap-4': cap4 as unknown as Chapter,
  'cap-5': cap5 as unknown as Chapter,
  'cap-6': cap6 as unknown as Chapter,
  'cap-7': cap7 as unknown as Chapter,
  'cap-8': cap8 as unknown as Chapter,
  'cap-9': cap9 as unknown as Chapter,
  'anexo-1': anexo1 as unknown as Chapter,
  'anexo-2': anexo2 as unknown as Chapter,
  'anexo-3': anexo3 as unknown as Chapter,
};
