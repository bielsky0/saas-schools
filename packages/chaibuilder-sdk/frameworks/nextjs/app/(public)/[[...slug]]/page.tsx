import { ChaiBuilder } from "@/package/ChaiBuilder";
import { ChaiPageStyles, PreviewBanner, RenderChaiBlocks } from "@/package/rsc";
import { ChaiPageProps } from "@/package/types";
import { registerPageTypes } from "@/page-types";
import { loadWebBlocks } from "@chaibuilder/sdk/web-blocks";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

loadWebBlocks();
registerPageTypes();

export const dynamic = "force-static";

export const generateMetadata = async (props: { params: Promise<{ slug: string[] }> }) => {
  const nextParams = await props.params;
  const slug = nextParams.slug ? `/${nextParams.slug.join("/")}` : "/";

  const { isEnabled } = await draftMode();
  ChaiBuilder.init(process.env.CHAIBUILDER_APP_KEY!, isEnabled);
  return await ChaiBuilder.getPageSeoData(slug);
};

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const nextParams = await params;
  const slug = nextParams.slug ? `/${nextParams.slug.join("/")}` : "/";

  const { isEnabled } = await draftMode();
  ChaiBuilder.init(process.env.CHAIBUILDER_APP_KEY!, isEnabled);
  let page = null;
  try {
    page = await ChaiBuilder.getPage(slug);
    if ("error" in page) {
      return notFound();
    }
  } catch (err) {
    throw err;
  }

  //NOTE: pageProps are received in your dataProvider functions for block and page
  const siteSettings = await ChaiBuilder.getSiteSettings();
  const pageProps: ChaiPageProps = {
    slug,
    pageType: page.pageType,
    fallbackLang: siteSettings.fallbackLang,
    pageLang: page.lang,
  };
  return (
    <html className={`scroll-smooth`} lang={page.lang}>
      <head>
        <ChaiPageStyles page={page} />
      </head>
      <body className={`font-body antialiased`}>
        <PreviewBanner slug={slug} show={isEnabled} />
        <RenderChaiBlocks page={page} pageProps={pageProps} />
      </body>
    </html>
  );
}
