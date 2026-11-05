import { notFound } from "next/navigation";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/i18n";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale) || locale === DEFAULT_LOCALE) {
    notFound();
  }
  return <>{children}</>;
}
