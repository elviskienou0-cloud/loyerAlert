import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGS, useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} aria-label={t("lang.label")}>
          {compact ? (
            <Languages className="size-5" />
          ) : (
            <span className="flex items-center gap-1.5">
              <span aria-hidden>{current.flag}</span>
              <span className="text-xs font-semibold uppercase">{current.code}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLang(l.code)}
            className={l.code === lang ? "font-semibold" : undefined}
          >
            <span aria-hidden className="mr-2">
              {l.flag}
            </span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
