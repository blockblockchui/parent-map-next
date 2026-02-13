# Parent Map HK - Next.js 部署指引

## Step 1: 創建 GitHub Repository

1. 去 https://github.com/new
2. Repository name: `parent-map-next`
3. 揀 "Public"
4. 唔要勾 "Add a README"
5. 按 "Create repository"

## Step 2: Push 代碼到 GitHub

複製以下指令（一次過貼入 terminal）：

```bash
cd /root/.openclaw/workspace/parent-map-next
git remote add origin https://github.com/blockblockchui/parent-map-next.git
git branch -M main
git push -u origin main
```

**會问你 GitHub username 同 password/token：**
- Username: `blockblockchui`
- Password: 用 GitHub Personal Access Token（去 https://github.com/settings/tokens 創建）

## Step 3: Vercel 部署

1. 去 https://vercel.com/new
2. 揀 "Import Git Repository"
3. 揀 `blockblockchui/parent-map-next`
4. Framework Preset: Next.js
5. 按 "Deploy"

## Step 4: 連結域名

1. 部署完成後，去 Vercel Dashboard
2. 揀項目 → Settings → Domains
3. 輸入 `parentmap.hk`
4. 跟隨指示加 DNS record（如果你用 Cloudflare/其他）

## 完成！
