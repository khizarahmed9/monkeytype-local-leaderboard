import Page from "./page";
import { qsr } from "../utils/dom";
import Ape from "../ape";
import { LocalLeaderboardEntry } from "@monkeytype/contracts";

export const page = new Page({
  id: "localLeaderboards",
  element: qsr("#pageLocalLeaderboards"),
  path: "/local-leaderboards",
  beforeShow: async () => {
    const tableBody = document.querySelector("#localLeaderboardTableBody");
    if (!tableBody) return;
    tableBody.innerHTML =
      "<tr><td colspan='5' style='padding: 1rem; text-align: center;'>Loading...</td></tr>";

    try {
      const response = await Ape.localLeaderboards.get();
      if (response.status === 200) {
        const entries = response.body.data;
        tableBody.innerHTML = "";
        if (entries.length === 0) {
          tableBody.innerHTML =
            "<tr><td colspan='5' style='padding: 1rem; text-align: center;'>No entries yet.</td></tr>";
        }
        entries.forEach((entry: LocalLeaderboardEntry, index: number) => {
          const row = document.createElement("tr");
          row.style.borderBottom = "1px solid var(--bg-color)";
          row.innerHTML = `
            <td style="padding: 0.5rem;">${index + 1}</td>
            <td style="padding: 0.5rem;">${entry.name}</td>
            <td style="padding: 0.5rem;">${entry.wpm.toFixed(2)}</td>
            <td style="padding: 0.5rem;">${entry.acc.toFixed(2)}%</td>
            <td style="padding: 0.5rem;">${new Date(entry.timestamp).toLocaleString()}</td>
          `;
          tableBody.appendChild(row);
        });
      } else {
        tableBody.innerHTML =
          "<tr><td colspan='5' style='padding: 1rem; text-align: center;'>Failed to load leaderboard.</td></tr>";
      }
    } catch (e) {
      tableBody.innerHTML =
        "<tr><td colspan='5' style='padding: 1rem; text-align: center;'>Error loading leaderboard.</td></tr>";
      console.error(e);
    }
  },
});
