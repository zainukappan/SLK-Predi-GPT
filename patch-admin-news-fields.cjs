const fs = require('fs');
let ts = fs.readFileSync('src/components/admin-news.tsx', 'utf8');

const oldFields = `<div className="field">
            <label>Slug (URL snippet, e.g. calicut-fc-wins)</label>
            <input type="text" name="slug" defaultValue={editing.slug} required pattern="[a-z0-9-]+" />
          </div>`;

const newFields = `<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <div className="field">
              <label>Slug (URL snippet, e.g. calicut-fc-wins)</label>
              <input type="text" name="slug" defaultValue={editing.slug} required pattern="[a-z0-9-]+" />
            </div>
            <div className="field">
              <label>Category</label>
              <select name="category" defaultValue={editing.category || "football"}>
                <option value="football">Football</option>
                <option value="cricket">Cricket</option>
                <option value="athletics">Athletics</option>
                <option value="others">Others</option>
              </select>
            </div>
            <div className="field">
              <label>Tags (Comma separated, e.g. ISL, Kerala Blasters)</label>
              <input type="text" name="tags" defaultValue={(editing.tags || []).join(", ")} />
            </div>
          </div>`;

ts = ts.replace(oldFields, newFields);

fs.writeFileSync('src/components/admin-news.tsx', ts);
