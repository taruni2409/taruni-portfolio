"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, TextArea, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/profile.json";

interface ProfileFields {
  name: string; tagline: string; bio: string; summary: string; obsession: string;
  currently: string; previous: string; prev_domain: string; interested_domain: string;
  location: string; email: string; phone: string; github: string; linkedin: string; resume: string;
  booking_url: string;
  page_experience: string; page_education: string; page_projects: string; contact_description: string;
  page_blog: string; page_lab: string; page_gallery: string; page_quotes: string;
}

const DEFAULT: ProfileFields = {
  name: "", tagline: "", bio: "", summary: "", obsession: "", currently: "",
  previous: "", prev_domain: "", interested_domain: "",
  location: "", email: "", phone: "", github: "", linkedin: "", resume: "",
  booking_url: "",
  page_experience: "", page_education: "", page_projects: "", contact_description: "",
  page_blog: "", page_lab: "", page_gallery: "", page_quotes: "",
};

const SECTIONS: { heading: string; fields: { key: keyof ProfileFields; label: string; multiline?: boolean; placeholder?: string }[] }[] = [
  {
    heading: "Identity",
    fields: [
      { key: "name",    label: "Full Name",  placeholder: "Jaya Sabarish Reddy Remala" },
      { key: "tagline", label: "Tagline",    placeholder: "Software Engineer · …" },
      { key: "bio",     label: "Bio",        multiline: true, placeholder: "1–2 sentence bio shown in At a Glance" },
      { key: "summary", label: "Summary",    multiline: true, placeholder: "Longer summary for SEO / Pumpkin context" },
    ],
  },
  {
    heading: "Current Focus",
    fields: [
      { key: "obsession",  label: "Obsession (blockquote on home)",  multiline: true },
      { key: "currently",  label: "Experimenting (\"Experimenting\" label on hero)", placeholder: "recommendation systems and search at scale…" },
    ],
  },
  {
    heading: "Career & Domains",
    fields: [
      { key: "previous",          label: "Previous Companies (comma-separated)",  placeholder: "NYU IT, Shell, Wipro" },
      { key: "prev_domain",       label: "Previous Domains (comma-separated)",    placeholder: "Energy, Bioinformatics" },
      { key: "interested_domain", label: "Interested Domains (comma-separated)",  placeholder: "Health Care, Finance" },
    ],
  },
  {
    heading: "Page Descriptions",
    fields: [
      { key: "page_experience", label: "Experience page sub-heading" },
      { key: "page_education",  label: "Education page sub-heading"  },
      { key: "page_projects",   label: "Projects page sub-heading"   },
      { key: "contact_description", label: "Contact section description", multiline: true },
      { key: "page_blog",    label: "Blog page description",    multiline: true },
      { key: "page_lab",     label: "Lab page description",     multiline: true },
      { key: "page_gallery", label: "Gallery page description", multiline: true },
      { key: "page_quotes",  label: "Quotes page description",  multiline: true },
    ],
  },
  {
    heading: "Contact & Links",
    fields: [
      { key: "location", label: "Location",  placeholder: "United States" },
      { key: "email",    label: "Email",     placeholder: "jr6421@nyu.edu" },
      { key: "phone",    label: "Phone",     placeholder: "+1 (516) …" },
      { key: "linkedin",    label: "LinkedIn URL" },
      { key: "github",      label: "GitHub URL"   },
      { key: "resume",      label: "Resume URL"   },
      { key: "booking_url", label: "Book a Call URL (Google Calendar)" },
    ],
  },
];

export default function ProfileEditor() {
  const gh = useGitHubFile(FILE);
  const [fields, setFields] = useState<ProfileFields>(DEFAULT);
  const [dirty, setDirty]   = useState(false);

  function set(key: keyof ProfileFields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleLoad() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = await gh.load<any>();
    if (!profile) return;
    setFields({
      name:                profile.name                ?? "",
      tagline:             profile.tagline             ?? "",
      bio:                 profile.bio                 ?? "",
      summary:             profile.summary             ?? "",
      obsession:           profile.obsession           ?? "",
      currently:           profile.currently           ?? "",
      previous:            profile.previous            ?? "",
      prev_domain:         profile.prev_domain         ?? "",
      interested_domain:   profile.interested_domain   ?? "",
      location:            profile.location            ?? "",
      email:               profile.email               ?? "",
      phone:               profile.phone               ?? "",
      github:              profile.github              ?? "",
      linkedin:            profile.linkedin            ?? "",
      resume:              profile.resume              ?? "",
      booking_url:         profile.booking_url         ?? "",
      page_experience:     profile.page_experience     ?? "",
      page_education:      profile.page_education      ?? "",
      page_projects:       profile.page_projects       ?? "",
      contact_description: profile.contact_description ?? "",
      page_blog:           profile.page_blog           ?? "",
      page_lab:            profile.page_lab            ?? "",
      page_gallery:        profile.page_gallery        ?? "",
      page_quotes:         profile.page_quotes         ?? "",
    });
    setDirty(false);
  }

  async function handleSave() {
    // Load full profile first, then merge only these fields
    const res = await fetch(`https://api.github.com/repos/sabarishreddy99/jayaremala/contents/${FILE}`, {
      headers: { Authorization: `Bearer ${gh.pat}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const data  = await res.json();
    const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
    const full  = JSON.parse(new TextDecoder("utf-8").decode(bytes));
    const merged = { ...full, ...fields };
    const ok = await gh.save(merged, "chore: update profile info");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Profile Info</h2>
        <DirtyBadge dirty={dirty} />
      </div>

      <GithubPATRow {...gh} onLoad={handleLoad} />

      {SECTIONS.map(sec => (
        <div key={sec.heading} className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">{sec.heading}</p>
          {sec.fields.map(f => (
            <div key={f.key}>
              <FieldLabel>{f.label}</FieldLabel>
              {f.multiline
                ? <TextArea value={fields[f.key]} onChange={v => set(f.key, v)} placeholder={f.placeholder} rows={3} disabled={!gh.loaded} />
                : <TextInput value={fields[f.key]} onChange={v => set(f.key, v)} placeholder={f.placeholder} disabled={!gh.loaded} />
              }
            </div>
          ))}
        </div>
      ))}

      <SaveRow onSave={handleSave} saving={gh.saving} loaded={gh.loaded} pat={gh.pat} dirty={dirty} />
      <ResultBanner result={gh.result} />
    </div>
  );
}
