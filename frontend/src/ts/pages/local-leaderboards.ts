import Page from "./page";
import { qsr } from "../utils/dom";
import Ape from "../ape";
import { LocalLeaderboardEntry } from "@monkeytype/contracts";

let allEntries: LocalLeaderboardEntry[] = [];
let currentSort: { field: "wpm" | "acc" | "date"; order: "asc" | "desc" } = {
  field: "wpm",
  order: "desc",
};
let currentFilter = "all";

function renderTable(): void {
  const tableBody = document.querySelector("#localLeaderboardTableBody");
  if (!tableBody) return;

  let filtered = allEntries;
  if (currentFilter !== "all") {
    filtered = filtered.filter(
      (e) => (e.testType || "unknown") === currentFilter,
    );
  }

  filtered.sort((a, b) => {
    let valA: number;
    let valB: number;

    if (currentSort.field === "wpm") {
      valA = a.wpm;
      valB = b.wpm;
    } else if (currentSort.field === "acc") {
      valA = a.acc;
      valB = b.acc;
    } else {
      valA = a.timestamp;
      valB = b.timestamp;
    }

    return currentSort.order === "desc" ? valB - valA : valA - valB;
  });

  tableBody.innerHTML = "";
  if (filtered.length === 0) {
    tableBody.innerHTML =
      "<tr><td colspan='6' style='padding: 1rem; text-align: center;'>No entries found.</td></tr>";
    return;
  }

  filtered.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid var(--bg-color)";
    row.innerHTML = `
      <td style="padding: 0.5rem;">${index + 1}</td>
      <td style="padding: 0.5rem;">${entry.name}</td>
      <td style="padding: 0.5rem;">${entry.wpm.toFixed(2)}</td>
      <td style="padding: 0.5rem;">${entry.acc.toFixed(2)}%</td>
      <td style="padding: 0.5rem;">${new Date(entry.timestamp).toLocaleString()}</td>
      <td style="padding: 0.5rem;">${entry.testType || "-"}</td>
    `;
    tableBody.appendChild(row);
  });
}

function updateSort(field: "wpm" | "acc" | "date"): void {
  if (currentSort.field === field) {
    currentSort.order = currentSort.order === "desc" ? "asc" : "desc";
  } else {
    currentSort.field = field;
    currentSort.order = "desc";
  }
  renderTable();
}

export const page = new Page({
  id: "localLeaderboards",
  element: qsr("#pageLocalLeaderboards"),
  path: "/local-leaderboards",
  beforeShow: async () => {
    const tableBody = document.querySelector("#localLeaderboardTableBody");
    if (!tableBody) return;
    tableBody.innerHTML =
      "<tr><td colspan='6' style='padding: 1rem; text-align: center;'>Loading...</td></tr>";

    try {
      const response = await Ape.localLeaderboards.get();
      if (response.status === 200) {
        allEntries = response.body.data;

        // Populate filter
        const filterSelect = document.getElementById(
          "localLeaderboardFilter",
        ) as HTMLSelectElement | null;
        if (filterSelect !== null) {
          const types = new Set(allEntries.map((e) => e.testType || "unknown"));
          filterSelect.innerHTML =
            '<option value="all">All Test Types</option>';
          types.forEach((type) => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type;
            filterSelect.appendChild(option);
          });

          filterSelect.onchange = (e) => {
            currentFilter = (e.target as HTMLSelectElement).value;
            renderTable();
          };
        }

        // Setup Sort Headers
        const headers = document.querySelectorAll("th[data-sort]");
        headers.forEach((th) => {
          // Remove old listeners to prevent duplicates if revisited (simple approach)
          const newTh = th.cloneNode(true);
          th.parentNode?.replaceChild(newTh, th);
          newTh.addEventListener("click", () => {
            const field = (newTh as HTMLElement).getAttribute("data-sort") as
              | "wpm"
              | "acc"
              | "date";
            updateSort(field);
          });
        });

        renderTable();
      } else {
        tableBody.innerHTML =
          "<tr><td colspan='6' style='padding: 1rem; text-align: center;'>Failed to load leaderboard.</td></tr>";
      }
    } catch (e) {
      tableBody.innerHTML =
        "<tr><td colspan='6' style='padding: 1rem; text-align: center;'>Error loading leaderboard.</td></tr>";
      console.error(e);
    }
  },
});
