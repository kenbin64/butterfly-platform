# Deploy to Production — DEPRECATED

> ⚠️ **This document is outdated.** The old rsync/push-to-vps workflow has been replaced.

## Current Deployment Method

The platform now uses **Point Collapse** — all source code is collapsed into a single Node.js artifact (`schwarz-diamond.point.js`) and deployed via GitHub.

**See:** `width/engine/deploy/DEPLOY_VPS.md` for the current deployment guide.

### Quick Reference

```bash
# On VPS:
cd /opt/butterfly-platform
git pull origin main
node width/engine/deploy/build.js
sudo cp width/engine/deploy/artifacts/schwarz-diamond.point.js /var/www/kensgames/
sudo systemctl restart kensgames
```

**Repo:** https://github.com/kenbin64/butterfly-platform.git
