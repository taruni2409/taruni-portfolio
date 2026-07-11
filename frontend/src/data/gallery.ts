import galleryJson from "@/data/knowledge/gallery.json";

export interface GalleryItem {
  id: string;
  title: string;
  caption?: string;
  src: string;        // /gallery/<id>.<ext>  (committed to public/gallery/)
  category?: string;
  date?: string;
}

export const gallery = galleryJson as GalleryItem[];
