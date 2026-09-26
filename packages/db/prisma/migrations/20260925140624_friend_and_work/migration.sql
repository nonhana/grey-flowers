-- 友链（FriendLink）与作品集（Work）入库。数据取自 apps/main/app/data/{friends,works}.json
-- 原文（friends 12 条 sortOrder 1–12，works 8 条 sortOrder 1–8），保证生产
-- migrate:deploy 后即得全量数据，无需 seed。

-- CreateTable
CREATE TABLE "FriendLink" (
    "id" SERIAL NOT NULL,
    "site" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" SERIAL NOT NULL,
    "site" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FriendLink_url_key" ON "FriendLink"("url");

-- CreateIndex
CREATE INDEX "FriendLink_sortOrder_idx" ON "FriendLink"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Work_url_key" ON "Work"("url");

-- CreateIndex
CREATE INDEX "Work_sortOrder_idx" ON "Work"("sortOrder");

-- Seed: friends.json（12 条，按 JSON 原顺序）
INSERT INTO "FriendLink" ("site", "owner", "url", "description", "image", "color", "sortOrder", "createdAt", "updatedAt") VALUES
    ('望月阁', 'Kaitaku', 'https://www.kaitaku.xyz', '一个萌新的 Notes', 'https://www.kaitaku.xyz/assets/avatar.webp', '#00BFFF', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('KUN''s Blog', 'KUN', 'https://kun.moe', 'KUN, Moe, CUTEST, animations, visual novel (galgame), programming.', 'https://www.kun.moe/avatar.webp', '#00BFFF', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Kloudy Shape', 'Kloudy', 'https://shape.kloudy.cn', 'Stay Hungry, Stay Foolish', 'https://api.kloudy.cn/img/icon.webp', '#0099ff', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('天翔TNXGの空间站', '天翔TNXG', 'https://tnxg.top', '明日尚未到来，希望凝于心上', 'https://api-space.tnxg.top/avatar?s=qq', '#77BBDD', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Mias/''s blog', 'AsperforMias', 'https://www.mias.moe', '『我追寻最初梦的光点，只为让噩梦迎来终焉。』', 'https://www.mias.moe/_astro/avatar.BYkgyyEt_ZIE92s.webp', '#858585', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Tianli''s Blog', 'Tianli', 'https://blog.tianli0.top/', '自知之明是最可贵的知识！', 'https://q2.qlogo.cn/headimg_dl?dst_uin=507249007&spec=640', '#00BFFF', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('yume', 'sayoriqwq', 'https://sayoriqwq.com', '个人技术博客，分享编程和生活的点滴', 'https://wsrv.nl/?url=r2.sayoriqwq.com/blog/avatar.webp&w=256&q=75&we=1&maxage=31536000', '#00BFFF', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('微光档案', '御守真幻', 'https://bikari.top', '虚幻的幸福', 'https://bikari.top/image/avatar/maestrale.webp', '#00BFFF', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Bhao', 'Bhao', 'https://dwd.moe', '布好布好布？好布好布好！', 'https://weavatar.com/avatar/e0bc851d0ad0c120ff604124bba77e19?s=256', '#90c21d', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PurplePlanen', 'PurplePlanen', 'https://purpleplanen.top', '二次元/前端萌新', 'https://avatars.githubusercontent.com/u/151366823?v=4', '#00BFFF', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('記緒漂流', '五月七日千緒', 'https://ttio.cc', '于记忆之川，泛思绪之舟。', 'https://avatars.githubusercontent.com/u/46957197', '#4682B4', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Modo''s Dreamland', 'Modo', 'https://modo.org.cn', 'Audentes fortuna iuvat', 'https://avatars.githubusercontent.com/u/227043249?v=4', '#6DA5DE', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed: works.json（8 条，按 JSON 原顺序）
INSERT INTO "Work" ("site", "owner", "url", "description", "image", "color", "sortOrder", "createdAt", "updatedAt") VALUES
    ('GreyFlowers', 'non_hana', 'https://caelum.moe', '『灰色的花，终有一天会盛开吧。』', 'https://static-r2.caelum.moe/greyflowers-nea.webp', '#858585', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Picals', 'non_hana', 'https://picals.caelum.moe', '一个受 Pixiv 启发的插画收藏交流平台', 'https://static-r2.caelum.moe/picals-logo.webp', '#00BFFF', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ApiPlayer', 'non_hana', 'https://apiplayer.caelum.moe', '一个模仿 Apifox 的 HTTP 接口管理平台', 'https://static-r2.caelum.moe/apiplayer-logo.svg', '#00BFFF', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('littleSharing', 'non_hana', 'https://littlesharing.caelum.moe', '用 Vue2 + JS 搓的一个小型 Markdown 社区', 'https://static-r2.caelum.moe/littlesharing-logo.webp', '#00BFFF', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('hana-img-viewer', 'non_hana', 'https://hana-img-viewer.netlify.app', '适用于 Vue3 + TS 的图片查看器', 'https://static-r2.caelum.moe/hana-img-viewer-logo.webp', '#00BFFF', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('hana-music-api', 'non_hana', 'https://hana-music-api.netlify.app/', '由 Bun + Hono 驱动的现代网易云音乐第三方 API', 'https://static-r2.caelum.moe/hana-music-api-logo.svg', '#2563eb', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campanula Music', 'non_hana', 'https://campanula.caelum.moe', '基于 SvelteKit 的 Web 音乐播放器', 'https://static-r2.caelum.moe/campanula-logo.webp', '#A8E6CF', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campanula Gallery', 'non_hana', 'https://gallery.caelum.moe', '随便弹的一些旋律。基于 SolidJS', 'https://static-r2.caelum.moe/gallery-logo.webp', '#A8E6CF', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);