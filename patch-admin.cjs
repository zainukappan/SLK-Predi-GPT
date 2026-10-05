const fs = require('fs');
let ts = fs.readFileSync('src/components/admin.tsx', 'utf8');

ts = ts.replace(
`import { PasswordInput } from "./password-input";
import { MemberPredictions } from "./member-predictions";`,
`import { PasswordInput } from "./password-input";
import { MemberPredictions } from "./member-predictions";
import { AdminNews } from "./admin-news";`
);

ts = ts.replace(
`  const tabs = [
    "overview",
    "members",
    "teams",
    "players",
    "rounds",
    "fixtures",
    "results",
    "predictions",
    "content",
    "reports",
  ];`,
`  const tabs = [
    "overview",
    "members",
    "teams",
    "players",
    "rounds",
    "fixtures",
    "results",
    "predictions",
    "content",
    "news",
    "reports",
  ];`
);

ts = ts.replace(
`      {tab === "content" && (`,
`      {tab === "news" && <AdminNews data={data} lang={lang} t={t} />}
      {tab === "content" && (`
);

fs.writeFileSync('src/components/admin.tsx', ts);
