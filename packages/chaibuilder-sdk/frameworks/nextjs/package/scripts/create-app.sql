-- ChaiBuilder Create App SQL Script
-- Replace the following placeholders before running this script:
-- - 'YOUR_USER_ID' (line 8): Your actual user UUID
-- - 'en' (line 9): Your preferred fallback language code (optional)
-- - 'My ChaiBuilder App' (line 10): Your desired project name

-- Generate a new app key (UUID) and set your user ID
WITH data_values AS (
    SELECT 
        gen_random_uuid() AS new_row_id,        -- The app key
        'YOUR_USER_ID'::text AS app_creator_id, -- Your user UUID (replace before running)
        'en'::text AS fallback_lang,            -- Change to your preferred language code
        'My ChaiBuilder App'::text AS project_name -- Change to your project name
),

-- Insert into apps table
app_insert AS (
    INSERT INTO apps (id, name, "user", theme, "fallbackLang")
    SELECT 
        new_row_id,
        project_name,
        app_creator_id,
        '{"fontFamily":{"heading":"Arial","body":"Arial"},"borderRadius":"6px","colors":{"background":["#FFFFFF","#09090B"],"foreground":["#09090B","#FFFFFF"],"primary":["#2563EB","#3B82F6"],"primary-foreground":["#FFFFFF","#FFFFFF"],"secondary":["#F4F4F5","#27272A"],"secondary-foreground":["#09090B","#FFFFFF"],"muted":["#F4F4F5","#27272A"],"muted-foreground":["#71717A","#A1A1AA"],"accent":["#F4F4F5","#27272A"],"accent-foreground":["#09090B","#FFFFFF"],"destructive":["#EF4444","#7F1D1D"],"destructive-foreground":["#FFFFFF","#FFFFFF"],"border":["#E4E4E7","#27272A"],"input":["#E4E4E7","#27272A"],"ring":["#2563EB","#3B82F6"],"card":["#FFFFFF","#09090B"],"card-foreground":["#09090B","#FFFFFF"],"popover":["#FFFFFF","#09090B"],"popover-foreground":["#09090B","#FFFFFF"]}}'::jsonb,
        fallback_lang
    FROM data_values
    RETURNING id
),
-- Insert into apps_online table
apps_online_insert AS (
    INSERT INTO apps_online (id, name, "user", theme, "fallbackLang", "apiKey")
    SELECT 
        new_row_id,
        project_name,
        app_creator_id,
        '{"fontFamily":{"heading":"Arial","body":"Arial"},"borderRadius":"6px","colors":{"background":["#FFFFFF","#09090B"],"foreground":["#09090B","#FFFFFF"],"primary":["#2563EB","#3B82F6"],"primary-foreground":["#FFFFFF","#FFFFFF"],"secondary":["#F4F4F5","#27272A"],"secondary-foreground":["#09090B","#FFFFFF"],"muted":["#F4F4F5","#27272A"],"muted-foreground":["#71717A","#A1A1AA"],"accent":["#F4F4F5","#27272A"],"accent-foreground":["#09090B","#FFFFFF"],"destructive":["#EF4444","#7F1D1D"],"destructive-foreground":["#FFFFFF","#FFFFFF"],"border":["#E4E4E7","#27272A"],"input":["#E4E4E7","#27272A"],"ring":["#2563EB","#3B82F6"],"card":["#FFFFFF","#09090B"],"card-foreground":["#09090B","#FFFFFF"],"popover":["#FFFFFF","#09090B"],"popover-foreground":["#09090B","#FFFFFF"]}}'::jsonb,
        fallback_lang,
        new_row_id
    FROM data_values
    RETURNING id
),
-- Insert into libraries table
library_insert AS (
    INSERT INTO libraries (name, app, type)
    SELECT 
        dv.project_name,
        ai.id,
        'default'
    FROM app_insert ai
    CROSS JOIN data_values dv
    RETURNING id, app
),
-- Insert into app_users table
app_users_insert AS (
    INSERT INTO app_users ("user", app, role)
    SELECT 
        dv.app_creator_id,
        ai.id,
        'admin'
    FROM app_insert ai
    CROSS JOIN data_values dv
    RETURNING app
),
-- Insert into app_pages table
page_insert AS (
    INSERT INTO app_pages (app, slug, name, "pageType", seo, blocks)
    SELECT 
        ai.id,
        '/',
        'Home',
        'page',
        '{"title": "ChaiBuilder App", "jsonLD": "", "keyword": "", "noIndex": false, "ogTitle": "ChaiBuilder App", "noFollow": false, "metaOther": "", "description": "", "canonicalUrl": "", "ogDescription": ""}'::jsonb,
        '[{"_id": "Y9xTtS", "tag": "section", "_name": "No-Code Hero Section", "_type": "Box", "styles": "#styles:,relative overflow-hidden bg-background h-screen flex justify-center items-center", "backgroundImage": ""}, {"_id": "U4IbsE", "tag": "div", "_name": "Box", "_type": "Box", "styles": "#styles:,mx-auto max-w-3xl text-center", "_parent": "Y9xTtS", "backgroundImage": ""}, {"_id": "h_UZdR", "tag": "div", "_name": "Box", "_type": "Box", "styles": "#styles:,mb-10 flex justify-center animate-in fade-in slide-in-from-top-4 duration-1000", "_parent": "U4IbsE", "backgroundImage": ""}, {"_id": "AV33Pw", "tag": "span", "_type": "Span", "styles": "#styles:,inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-foreground ring-1 ring-inset ring-border", "_parent": "h_UZdR", "content": "ChaiBuilder + NextJS"}, {"_id": "-UswQS", "tag": "h1", "_type": "Heading", "styles": "#styles:,text-balance font-serif text-5xl font-medium tracking-tight text-foreground sm:text-7xl", "_parent": "U4IbsE", "content": "Heading goes here"}, {"_id": "Mg0GoK", "_type": "Text", "styles": "#styles:,text-black", "_parent": "-UswQS", "content": "Publish websites with "}, {"_id": "da5fie", "tag": "span", "_type": "Span", "styles": "#styles:,italic text-primary", "_parent": "-UswQS", "content": "single click."}, {"_id": "9plKZu", "_type": "Paragraph", "styles": "#styles:,mt-8 text-pretty text-lg font-medium text-muted-foreground sm:text-xl/8", "_parent": "U4IbsE", "content": "<p> The visual site builder for content-heavy Next.js sites. Drag, drop, and deploy to the edge without touching a line of code. Happy building.</p>"}, {"_id": "XYQHqQ", "tag": "div", "_name": "Box", "_type": "Box", "styles": "#styles:,mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row", "_parent": "U4IbsE", "backgroundImage": ""}, {"_id": "JfdeIK", "link": {"href": "/editor"}, "_type": "Link", "styles": "#styles:,group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-xl bg-primary px-10 font-bold text-primary-foreground transition-all hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(var(--primary),0.3)] active:scale-95", "_parent": "XYQHqQ", "content": "Link text goes here", "prefetchLink": false}, {"_id": "KJ8m6K", "tag": "span", "_type": "Span", "styles": "#styles:,relative flex items-center gap-2", "_parent": "JfdeIK", "content": "Open Editor"}]'::jsonb
    FROM app_insert ai
    RETURNING id, app
),
-- Insert into app_pages_online table
app_pages_online_insert AS (
    INSERT INTO app_pages_online (id, app, slug, name, "pageType", seo, blocks)
    SELECT 
        pi.id,
        pi.app,
        '/',
        'Home',
        'page',
        '{"title": "ChaiBuilder App", "jsonLD": "", "keyword": "", "noIndex": false, "ogTitle": "ChaiBuilder App", "noFollow": false, "metaOther": "", "description": "", "canonicalUrl": "", "ogDescription": ""}'::jsonb,
        '[{"_id": "Y9xTtS", "tag": "section", "_name": "No-Code Hero Section", "_type": "Box", "styles": "#styles:,relative overflow-hidden bg-background h-screen flex justify-center items-center", "backgroundImage": ""}, {"_id": "U4IbsE", "tag": "div", "_name": "Box", "_type": "Box", "styles": "#styles:,mx-auto max-w-3xl text-center", "_parent": "Y9xTtS", "backgroundImage": ""}, {"_id": "h_UZdR", "tag": "div", "_name": "Box", "_type": "Box", "styles": "#styles:,mb-10 flex justify-center animate-in fade-in slide-in-from-top-4 duration-1000", "_parent": "U4IbsE", "backgroundImage": ""}, {"_id": "AV33Pw", "tag": "span", "_type": "Span", "styles": "#styles:,inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-foreground ring-1 ring-inset ring-border", "_parent": "h_UZdR", "content": "ChaiBuilder + NextJS"}, {"_id": "-UswQS", "tag": "h1", "_type": "Heading", "styles": "#styles:,text-balance font-serif text-5xl font-medium tracking-tight text-foreground sm:text-7xl", "_parent": "U4IbsE", "content": "Heading goes here"}, {"_id": "Mg0GoK", "_type": "Text", "styles": "#styles:,text-black", "_parent": "-UswQS", "content": "Publish websites with "}, {"_id": "da5fie", "tag": "span", "_type": "Span", "styles": "#styles:,italic text-primary", "_parent": "-UswQS", "content": "single click."}, {"_id": "9plKZu", "_type": "Paragraph", "styles": "#styles:,mt-8 text-pretty text-lg font-medium text-muted-foreground sm:text-xl/8", "_parent": "U4IbsE", "content": "<p> The visual site builder for content-heavy Next.js sites. Drag, drop, and deploy to the edge without touching a line of code. Happy building.</p>"}, {"_id": "XYQHqQ", "tag": "div", "_name": "Box", "_type": "Box", "styles": "#styles:,mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row", "_parent": "U4IbsE", "backgroundImage": ""}, {"_id": "JfdeIK", "link": {"href": "/editor"}, "_type": "Link", "styles": "#styles:,group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-xl bg-primary px-10 font-bold text-primary-foreground transition-all hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(var(--primary),0.3)] active:scale-95", "_parent": "XYQHqQ", "content": "Link text goes here", "prefetchLink": false}, {"_id": "KJ8m6K", "tag": "span", "_type": "Span", "styles": "#styles:,relative flex items-center gap-2", "_parent": "JfdeIK", "content": "Open Editor"}]'::jsonb
    FROM page_insert pi
    RETURNING id, app
)
-- Display the app key
SELECT 
    ai.id AS app_key,
    'CHAIBUILDER_APP_KEY=' || ai.id AS env_variable,
    'Add this to your .env file' AS instruction
FROM app_insert ai;
