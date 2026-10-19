const search = document.getElementById("search");
const unitFilter = document.getElementById("unit");
const statusFilter = document.getElementById("statusFilter");
const memberRows = document.getElementById("memberRows");
const emptyMessage = document.getElementById("emptyMessage");
const statCards = [...document.querySelectorAll(".stats .stat-card")];
const memberForm = document.getElementById("memberForm");
const nameInput = document.getElementById("memberName");
const unitInput = document.getElementById("memberUnit");
const roleInput = document.getElementById("memberRole");
const statusInput = document.getElementById("memberStatus");
const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveMember");
const cancelEditButton = document.getElementById("cancelEdit");
const exportCsvButton = document.getElementById("exportCsv");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector(".theme-icon");
const themeLabel = themeToggle.querySelector(".theme-label");
const themeStorageKey = "redhub-latihan-theme-v1";

function applyTheme(theme, persist = false) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap");
  themeIcon.textContent = isDark ? "☀" : "☾";
  themeLabel.textContent = isDark ? "Mode Terang" : "Mode Gelap";
  if (persist) {
    try {
      localStorage.setItem(themeStorageKey, isDark ? "dark" : "light");
    } catch (error) {
      // Tema tetap aktif selama halaman ini terbuka meski penyimpanan tidak tersedia.
    }
  }
}

applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme, true);
});

const storageKey = "redhub-latihan-members-v1";

const initialMembers = [...memberRows.querySelectorAll("tr")].map((row, index) => ({
  id: `seed-${index + 1}`,
  name: row.dataset.name,
  unit: row.dataset.unit,
  role: row.cells[2].textContent.trim(),
  status: row.dataset.status
}));

function readMembers() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return initialMembers;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Invalid saved data");
    return parsed;
  } catch (error) {
    return initialMembers;
  }
}

let members = readMembers();
let editingId = null;

function saveMembers() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(members));
    return true;
  } catch (error) {
    alert("Browser tidak dapat menyimpan data. Periksa pengaturan penyimpanan browser.");
    return false;
  }
}

function updateStatistics() {
  const total = members.length;
  const present = members.filter(member => member.status === "Hadir").length;
  const notCheckedIn = members.filter(member => member.status === "Belum Absen").length;
  const units = new Set(members.map(member => member.unit).filter(Boolean)).size;
  const attendanceRate = total ? (present / total) * 100 : 0;

  statCards[0].querySelector(".stat-number").textContent = total;
  statCards[1].querySelector(".stat-number").textContent = present;
  statCards[1].querySelector("small").textContent =
    `${attendanceRate.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari total anggota`;
  statCards[2].querySelector(".stat-number").textContent = notCheckedIn;
  statCards[3].querySelector(".stat-number").textContent = units;
  updateAttendanceAnalytics(total, present, notCheckedIn, attendanceRate);
}

function updateAttendanceAnalytics(total, present, notCheckedIn, attendanceRate) {
  const rate = total ? Math.round(attendanceRate) : 0;
  const donut = document.getElementById("attendanceDonut");
  if (!donut) return;
  donut.style.setProperty("--attendance-angle", `${rate * 3.6}deg`);
  donut.setAttribute("aria-label", `Tingkat kehadiran ${rate}%`);
  document.getElementById("attendanceRateValue").textContent = `${rate}%`;
  document.getElementById("analyticsPresent").textContent = present;
  document.getElementById("analyticsAbsent").textContent = notCheckedIn;
  document.getElementById("attendanceSummary").textContent =
    `${present.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} anggota telah hadir.`;

  const chart = document.getElementById("unitAttendanceChart");
  const unitOrder = ["DPC", "PAC", "BADAN", "SAYAP"];
  const unitLabels = { DPC: "DPC", PAC: "PAC", BADAN: "Badan", SAYAP: "Sayap" };
  const counts = unitOrder.map(unit => {
    const group = members.filter(member => member.unit === unit);
    return {
      unit,
      label: unitLabels[unit],
      total: group.length,
      present: group.filter(member => member.status === "Hadir").length,
      absent: group.filter(member => member.status === "Belum Absen").length
    };
  }).filter(group => group.total > 0);
  if (!counts.length) {
    chart.innerHTML = '<div class="unit-chart-empty">Belum ada data anggota untuk dianalisis.</div>';
    return;
  }
  chart.replaceChildren();
  counts.forEach(group => {
    const row = document.createElement("div");
    row.className = "unit-chart-row";
    const label = document.createElement("span");
    label.className = "unit-chart-label";
    label.textContent = group.label;
    const track = document.createElement("div");
    track.className = "unit-chart-track";
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", `${group.label}: ${group.present} hadir, ${group.absent} belum absen`);
    const presentBar = document.createElement("span");
    presentBar.className = "unit-chart-present";
    presentBar.style.width = `${group.total ? group.present / group.total * 100 : 0}%`;
    const absentBar = document.createElement("span");
    absentBar.className = "unit-chart-absent";
    absentBar.style.width = `${group.total ? group.absent / group.total * 100 : 0}%`;
    track.append(presentBar, absentBar);
    const values = document.createElement("span");
    values.className = "unit-chart-values";
    values.innerHTML = `<strong>${group.present}</strong> / ${group.total}`;
    row.append(label, track, values);
    chart.append(row);
  });
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderMembers() {
  const query = search.value.toLowerCase().trim();
  const selectedUnit = unitFilter.value;
  const selectedStatus = statusFilter.value;
  memberRows.replaceChildren();
  let visible = 0;

  members.forEach(member => {
    const matchesName = member.name.toLowerCase().includes(query);
    const matchesUnit = !selectedUnit || member.unit === selectedUnit;
    const matchesStatus = !selectedStatus || member.status === selectedStatus;
    if (!matchesName || !matchesUnit || !matchesStatus) return;

    visible++;
    const row = document.createElement("tr");
    row.dataset.name = member.name;
    row.dataset.unit = member.unit;
    row.dataset.status = member.status;

    const nameCell = document.createElement("td");
    const name = document.createElement("strong");
    name.textContent = member.name;
    nameCell.append(name);
    row.append(nameCell);
    const unitCell = document.createElement("td");
    const unitTag = document.createElement("span");
    const unitLabels = { DPC: "DPC", PAC: "PAC", BADAN: "Badan", SAYAP: "Sayap" };
    unitTag.className = "unit-tag " + (member.unit === "DPC" ? "unit-dpc" : member.unit === "PAC" ? "unit-pac" : member.unit === "BADAN" ? "unit-badan" : "unit-sayap");
    unitTag.textContent = unitLabels[member.unit] || member.unit;
    unitCell.append(unitTag);
    row.append(unitCell);
    row.append(makeCell(member.role));

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `status ${member.status === "Hadir" ? "present" : "absent"}`;
    statusBadge.textContent = member.status;
    statusCell.append(statusBadge);
    row.append(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "row-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button-small button-edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => startEditing(member.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button-small button-delete";
    deleteButton.textContent = "Hapus";
    deleteButton.addEventListener("click", () => deleteMember(member.id));
    actionsCell.append(editButton, deleteButton);
    row.append(actionsCell);
    memberRows.append(row);
  });

  emptyMessage.hidden = visible !== 0;
  updateStatistics();
}

function resetForm() {
  editingId = null;
  memberForm.reset();
  formTitle.textContent = "Tambah Anggota";
  saveButton.textContent = "Tambah Anggota";
  cancelEditButton.hidden = true;
}

function startEditing(id) {
  const member = members.find(item => item.id === id);
  if (!member) return;
  editingId = id;
  nameInput.value = member.name;
  unitInput.value = member.unit;
  roleInput.value = member.role;
  statusInput.value = member.status;
  formTitle.textContent = "Edit Anggota";
  saveButton.textContent = "Simpan Perubahan";
  cancelEditButton.hidden = false;
  memberForm.scrollIntoView({ behavior: "smooth", block: "start" });
  nameInput.focus();
}

function deleteMember(id) {
  const member = members.find(item => item.id === id);
  if (!member || !confirm(`Hapus anggota "${member.name}"?`)) return;
  members = members.filter(item => item.id !== id);
  saveMembers();
  if (editingId === id) resetForm();
  renderMembers();
}

memberForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const role = roleInput.value.trim();
  if (!name || !role) return;

  if (editingId) {
    members = members.map(member => member.id === editingId
      ? { ...member, name, unit: unitInput.value, role, status: statusInput.value }
      : member);
  } else {
    members.push({
      id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      unit: unitInput.value,
      role,
      status: statusInput.value
    });
  }

  saveMembers();
  resetForm();
  renderMembers();
});

cancelEditButton.addEventListener("click", resetForm);
search.addEventListener("input", renderMembers);
unitFilter.addEventListener("change", renderMembers);
statusFilter.addEventListener("change", renderMembers);

renderMembers();


function exportMembersCsv() {
  const headers = ["Nama Anggota", "Unit", "Jabatan", "Status"];
  const rows = members.map(member => [
    member.name,
    member.unit === "BADAN" ? "Badan" : member.unit === "SAYAP" ? "Sayap" : member.unit,
    member.role,
    member.status
  ]);
  const escapeCsv = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map(row => row.map(escapeCsv).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "redhub-data-anggota.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

exportCsvButton.addEventListener("click", exportMembersCsv);


/* V13 — Role-based responsive UI prototype. Demo-only; no production auth/API. */
(function initRoleBasedDemo() {
  const ROLE_KEY = "redhub-demo-session-v1";
  const roleLabels = {
    super_admin: "Super Admin",
    admin: "Admin Kesekretariatan",
    pengurus: "Pengurus"
  };
  const roleSubtitles = {
    super_admin: "Administrasi platform dan tata kelola organisasi",
    admin: "Pengelolaan operasional organisasi",
    pengurus: "Ruang kerja pengurus"
  };
  const navByRole = {
    super_admin: [
      ["dashboard", "Dashboard", "grid-2x2"],
      ["struktur", "Struktur Organisasi", "network"],
      ["anggota", "Pengurus & Anggota", "users"],
      ["rapat", "Rapat / Kegiatan", "calendar-days"],
      ["scanner", "Scanner QR", "scan-line"],
      ["undangan", "Undangan & WhatsApp", "send"],
      ["absensi", "Absensi", "clipboard-check"],
      ["laporan", "Laporan", "chart-no-axes-combined"],
      ["admins", "Kelola Admin", "shield-check"],
      ["whatsapp-settings", "Pengaturan WhatsApp", "message-circle"],
      ["audit", "Audit Log", "history"],
      ["konfigurasi", "Konfigurasi Sistem", "settings"]
    ],
    admin: [
      ["dashboard", "Dashboard", "grid-2x2"],
      ["struktur", "Struktur Organisasi", "network"],
      ["anggota", "Pengurus & Anggota", "users"],
      ["rapat", "Rapat / Kegiatan", "calendar-days"],
      ["scanner", "Scanner QR", "scan-line"],
      ["undangan", "Undangan & WhatsApp", "send"],
      ["absensi", "Absensi", "clipboard-check"],
      ["laporan", "Laporan", "chart-no-axes-combined"]
    ],
    pengurus: [
      ["dashboard", "Beranda", "grid-2x2"],
      ["qr-saya", "QR Saya", "scan-qr-code"],
      ["rapat-saya", "Rapat Saya", "calendar-days"],
      ["riwayat", "Riwayat Kehadiran", "history"],
      ["rapor-saya", "Rapor Saya", "chart-no-axes-combined"],
      ["profil", "Profil Saya", "user-round"]
    ]
  };
  const pageMeta = {
    dashboard: ["Dashboard", "RINGKASAN ORGANISASI", "Pantau aktivitas dan kehadiran organisasi dalam satu ruang kerja."],
    struktur: ["Struktur Organisasi", "TATA KELOLA ORGANISASI", "Kelola unit organisasi dan periode kepengurusan."],
    anggota: ["Pengurus & Anggota", "DATA ORGANISASI", "Kelola identitas, unit, jabatan, dan status anggota."],
    rapat: ["Rapat / Kegiatan", "AGENDA ORGANISASI", "Atur agenda, peserta, undangan, dan status rapat."],
    scanner: ["Scanner QR", "CHECK-IN KEHADIRAN", "Validasi identitas anggota sebelum mencatat kehadiran."],
    undangan: ["Undangan & WhatsApp", "DISTRIBUSI UNDANGAN", "Kelola dokumen undangan dan distribusi undangan melalui WhatsApp."],
    absensi: ["Absensi", "MONITORING KEHADIRAN", "Pantau dan koreksi kehadiran dengan jejak perubahan."],
    laporan: ["Laporan", "ANALITIK & PELAPORAN", "Tinjau, analisis, dan ekspor ringkasan kehadiran."],
    admins: ["Kelola Admin", "AKSES PLATFORM", "Atur akses dan akun administratif."],
    "whatsapp-settings": ["Pengaturan WhatsApp", "INTEGRASI PLATFORM", "Kelola preferensi integrasi WhatsApp."],
    audit: ["Audit Log", "JEJAK AKTIVITAS", "Tinjau riwayat aktivitas operasional."],
    konfigurasi: ["Konfigurasi Sistem", "PREFERENSI PLATFORM", "Kelola preferensi umum platform."],
    "qr-saya": ["QR Saya", "IDENTITAS DIGITAL", "Tampilkan kartu QR anggota untuk kebutuhan check-in."],
    "rapat-saya": ["Rapat Saya", "AGENDA PRIBADI", "Lihat agenda yang ditujukan kepada Anda."],
    riwayat: ["Riwayat Kehadiran", "REKAM KEHADIRAN", "Lihat riwayat kehadiran pribadi."],
    "rapor-saya": ["Rapor Saya", "RINGKASAN PRIBADI", "Pantau perkembangan kehadiran Anda."],
    profil: ["Profil Saya", "IDENTITAS ANGGOTA", "Informasi profil dan jabatan aktif Anda."]
  };
  const icons = {
    "grid-2x2": '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    network: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M5 16.5v-3h14v3M12 11.5 5 13.5M12 11.5l7 2"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.3A4.7 4.7 0 0 1 8.2 14h1.6a4.7 4.7 0 0 1 4.7 4.7V20M16 5.2a3 3 0 0 1 0 5.6M17 14.5h.4a3.7 3.7 0 0 1 3.6 3.7V20"/>',
    "calendar-days": '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h2M14 14h2M8 17h2"/>',
    "scan-line": '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
    "send": '<path d="m21 3-7.2 18-3.9-7.9L2 9.2 21 3Z"/><path d="M9.9 13.1 21 3"/>',
    "clipboard-check": '<rect x="5" y="4.5" width="14" height="17" rx="2"/><path d="M9 4.5v-1h6v1M8.5 13l2.2 2.2 4.8-5"/>',
    "chart-no-axes-combined": '<path d="M3 3v18h18M7 14l4-4 4 3 5-7"/>',
    "shield-check": '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    "message-circle": '<path d="M20.5 11.5a8.4 8.4 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.8-4.5a8.8 8.8 0 1 1 15.7-5Z"/>',
    history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1 1.8-1.8 3.1-2.1-.5a8 8 0 0 1-1.7 1l-.4 2.1h-3.6l-.4-2.1a8 8 0 0 1-1.7-1l-2.1.5L5 16.9l1.1-1.8a8 8 0 0 1 0-2l-1.1-1.8 1.8-3.1 2.1.5a8 8 0 0 1 1.7-1l.4-2.1h3.6l.4 2.1a8 8 0 0 1 1.7 1l2.1-.5 1.8 3.1-1.1 1.8a8 8 0 0 1 0 2Z"/>',
    "scan-qr-code": '<rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h2v2h-2zM18.5 14.5h2M18.5 18.5v2M14.5 19.5h2"/>',
    "user-round": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };
  const demoMeetings = [
    { title: "Rapat Koordinasi DPC", date: "22 Okt 2026 · 19.00", unit: "DPC", status: "Terjadwal" },
    { title: "Evaluasi Program Kerja", date: "25 Okt 2026 · 09.00", unit: "DPC + PAC", status: "Undangan disiapkan" },
    { title: "Konsolidasi Pengurus", date: "28 Okt 2026 · 13.30", unit: "Badan & Sayap", status: "Draft" }
  ];
  const demoAttendance = [
    ["Andi Pratama", "DPC", "Sekretaris", "Hadir"],
    ["Siti Rahmawati", "PAC", "Bendahara", "Hadir"],
    ["Budi Santoso", "BADAN", "Anggota", "Belum Absen"],
    ["Dewi Lestari", "SAYAP", "Sekretaris", "Hadir"],
    ["Rudi Hartono", "PAC", "Ketua", "Belum Absen"]
  ];
  const body = document.body;
  const main = document.querySelector(".workspace");
  const navList = document.querySelector(".nav-list");
  const sidebar = document.querySelector(".sidebar");
  const topbar = document.querySelector(".topbar");
  const originalHeading = document.querySelector(".page-heading");
  const pageFooter = document.querySelector(".page-footer");
  const brandStage = document.querySelector(".brand-stage");
  const overviewSection = document.querySelector(".section-block:not(.analytics-section)");
  const analyticsSection = document.querySelector(".analytics-section");
  const membersPanel = document.querySelector(".panel");
  if (!main || !navList || !sidebar || !topbar) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }
  function svgIcon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (icons[name] || icons["grid-2x2"]) + '</svg>';
  }
  function toast(message, type) {
    let host = document.getElementById("demoToast");
    if (!host) {
      host = document.createElement("div");
      host.id = "demoToast";
      host.className = "demo-toast";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.append(host);
    }
    host.className = "demo-toast is-visible" + (type ? " " + type : "");
    host.textContent = message;
    window.clearTimeout(host._hideTimer);
    host._hideTimer = window.setTimeout(function () { host.classList.remove("is-visible"); }, 2800);
  }
  function metricCard(label, value, detail, variant) {
    return '<article class="stat-card ' + (variant || "") + '"><div class="stat-topline"><span class="stat-label">' + label + '</span><span class="online-dot"></span></div><div class="stat-number">' + value + '</div><div class="stat-foot"><small>' + detail + '</small></div></article>';
  }
  function panel(title, subtitle, content, actions) {
    return '<section class="panel generated-panel"><div class="panel-heading"><div class="panel-title"><p class="section-kicker">REDHUB WORKSPACE</p><h2>' + title + '</h2><p class="subtitle">' + subtitle + '</p></div><div class="panel-actions">' + (actions || "") + '</div></div>' + content + '</section>';
  }
  function table(headers, rows) {
    return '<div class="table-wrap generated-table-wrap"><table><thead><tr>' + headers.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join("") + '</tr></thead><tbody>' + rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + cell + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>';
  }
  function button(label, action, secondary) {
    return '<button type="button" class="' + (secondary ? "button-secondary" : "button-primary") + '" data-action="' + action + '">' + label + '</button>';
  }
  function statusBadge(status) {
    const kind = status === "Hadir" || status === "Aktif" || status === "Terkirim" ? "present" : (status === "Terlambat" || status === "Draft" ? "warning" : "absent");
    return '<span class="status ' + kind + '">' + status + '</span>';
  }
  function pageContent(route, role) {
    if (route === "struktur") {
      const rows = [
        ["DPC", "Kabupaten", "21 pengurus", statusBadge("Aktif"), '<button class="button-small button-edit" data-action="detail-struktur">Lihat unit</button>'],
        ["PAC", "Kecamatan", "31 unit · K/S/B", statusBadge("Aktif"), '<button class="button-small button-edit" data-action="detail-struktur">Lihat unit</button>'],
        ["Badan", "Unit khusus", "5 unit · K/S/B", statusBadge("Aktif"), '<button class="button-small button-edit" data-action="detail-struktur">Lihat unit</button>'],
        ["Sayap", "Unit organisasi", "4 unit · K/S/B", statusBadge("Aktif"), '<button class="button-small button-edit" data-action="detail-struktur">Lihat unit</button>']
      ];
      return panel("Struktur organisasi", "Hierarki unit dan komposisi pengurus contoh.", table(["Unit", "Cakupan", "Komposisi", "Status", "Aksi"], rows), button("＋ Tambah Unit", "new-unit"));
    }
    if (route === "rapat" || route === "rapat-saya") {
      const rows = demoMeetings.map(function (m, i) {
        return [escapeHtml(m.title), escapeHtml(m.date), escapeHtml(m.unit), statusBadge(m.status), role === "pengurus" ? '<button class="button-small button-edit" data-action="meeting-detail">Detail</button>' : '<button class="button-small button-edit" data-action="meeting-detail">Kelola</button>'];
      });
      return panel(route === "rapat-saya" ? "Agenda untuk Anda" : "Daftar rapat / kegiatan", route === "rapat-saya" ? "Agenda demo yang ditujukan kepada akun pengurus." : "Daftar agenda contoh; status dan peserta bukan data produksi.", table(["Agenda", "Jadwal", "Peserta", "Status", "Aksi"], rows), role === "pengurus" ? "" : button("＋ Buat Rapat", "new-meeting"));
    }
    if (route === "scanner") {
      return '<div class="scanner-layout"><section class="scanner-card"><div class="scanner-frame"><div class="scanner-corner tl"></div><div class="scanner-corner tr"></div><div class="scanner-corner bl"></div><div class="scanner-corner br"></div><div class="scanner-scanline"></div><div class="scanner-center-icon">' + svgIcon("scan-line") + '</div></div><p class="scanner-kicker">SCANNER CHECK-IN</p><h2>Validasi QR anggota</h2><p class="subtitle">Simulasi scanner. Kamera dan backend produksi tidak terhubung.</p><label class="field-label" for="scanMemberId">ID anggota demo</label><input id="scanMemberId" class="demo-input" type="text" placeholder="Contoh: MBR-0001"><button class="button-primary" type="button" data-action="scan-member">Validasi Anggota</button></section><section class="analytics-card"><div class="analytics-card-heading"><div><h3>Alur check-in</h3><p>Validasi sebelum absensi dicatat</p></div></div><ol class="step-list"><li><b>01</b><span>Scan QR anggota</span></li><li><b>02</b><span>Pastikan identitas dan rapat sesuai</span></li><li><b>03</b><span>Catat kehadiran dengan status demo</span></li></ol><p class="demo-note">Data hanya simulasi lokal dan tidak mengubah absensi produksi.</p></section></div>';
    }
    if (route === "undangan") {
      return panel("Undangan dan distribusi", "Alur contoh untuk PDF undangan dan broadcast WhatsApp.", '<div class="generated-content-grid"><article class="analytics-card"><span class="stat-label">DOKUMEN UNDANGAN</span><h3>Rapat Koordinasi DPC</h3><p class="subtitle">PDF undangan belum diunggah pada simulasi ini.</p><label class="upload-zone"><span class="upload-symbol">↑</span><strong>Pilih PDF undangan</strong><small>PDF · maksimal mengikuti konfigurasi demo</small><input id="invitationPdf" type="file" accept="application/pdf"></label><p id="pdfName" class="form-hint">Belum ada berkas dipilih.</p></article><article class="analytics-card"><span class="stat-label">RINGKASAN DISTRIBUSI</span><div class="stat-number">31</div><p class="subtitle">Target demo untuk agenda terpilih</p><div class="distribution-row"><span>Siap dikirim</span><strong id="distributionReady">31 penerima</strong></div><div class="distribution-row"><span>Status gateway</span><strong>Simulasi saja</strong></div><button class="button-primary" type="button" data-action="send-invitation">Simulasikan Broadcast</button><p class="demo-note">Tidak ada pesan WhatsApp yang benar-benar dikirim.</p></article></div>');
    }
    if (route === "absensi") {
      const rows = demoAttendance.map(function (m, i) {
        return [escapeHtml(m[0]), escapeHtml(m[1]), escapeHtml(m[2]), '<span class="status ' + (m[3] === "Hadir" ? "present" : "absent") + '" data-status-cell>' + m[3] + '</span>', '<button class="button-small button-edit" data-action="toggle-attendance" data-row="' + i + '">Ubah status</button>'];
      });
      return panel("Monitoring absensi", "Pantau kehadiran peserta dan lakukan koreksi sesuai kebutuhan.", '<div class="table-toolbar"><div class="table-caption"><strong>Peserta rapat</strong><span class="data-source-pill"><span class="online-dot"></span> Data demo</span></div><label class="search-box" for="attendanceSearch"><input id="attendanceSearch" type="search" placeholder="Cari nama peserta..." aria-label="Cari nama peserta"></label></div>' + table(["Nama", "Unit", "Jabatan", "Kehadiran", "Aksi"], rows) + '<p class="demo-note">Koreksi pada halaman ini hanya mengubah tampilan sesi, tidak tersimpan ke server.</p>', button("Ekspor CSV", "export-attendance", true));
    }
    if (route === "laporan" || route === "rapor-saya") {
      const personal = role === "pengurus";
      return '<div class="stats generated-stats">' + metricCard(personal ? "KEHADIRAN PRIBADI" : "TINGKAT KEHADIRAN", personal ? "92%" : "67,2%", personal ? "11 dari 12 agenda" : "86 dari 128 anggota", "stat-present") + metricCard(personal ? "HADIR" : "TOTAL ANGGOTA", personal ? "11" : "128", personal ? "Dalam periode aktif" : "Seluruh unit demo", "") + metricCard(personal ? "IZIN" : "BELUM ABSEN", personal ? "1" : "42", personal ? "Tercatat pada agenda" : "Perlu ditindaklanjuti", "stat-absent") + '</div>' + panel(personal ? "Rapor kehadiran saya" : "Ringkasan laporan", "Ringkasan kehadiran untuk periode yang dipilih.", '<div class="report-bars"><div><span>September</span><i style="--bar:82%"></i><b>82%</b></div><div><span>Oktober</span><i style="--bar:92%"></i><b>92%</b></div><div><span>November</span><i style="--bar:76%"></i><b>76%</b></div></div><p class="demo-note">Grafik contoh untuk pratinjau UI, bukan tren historis produksi.</p>', button("Ekspor CSV", "export-report", true) + button("Cetak Laporan", "print-report", false));
    }
    if (route === "admins") {
      return panel("Akun administratif", "Hanya Super Admin yang melihat halaman ini pada prototype.", table(["Nama", "Peran", "Status", "Aktivitas Terakhir", "Aksi"], [
        ["Administrator DPC", "Admin Kesekretariatan", statusBadge("Aktif"), "Hari ini · 08.45", '<button class="button-small button-edit" data-action="admin-detail">Kelola</button>'],
        ["Operator Sekretariat", "Admin Kesekretariatan", statusBadge("Aktif"), "Kemarin · 16.20", '<button class="button-small button-edit" data-action="admin-detail">Kelola</button>']
      ]), button("＋ Tambah Admin", "new-admin"));
    }
    if (route === "whatsapp-settings") {
      return panel("Koneksi WhatsApp", "Panel presentasi konfigurasi; token gateway asli tidak dimuat.", '<div class="settings-form"><label class="field-label" for="gatewayMode">Mode integrasi</label><select class="demo-input" id="gatewayMode"><option>Fonnte Lite · Demo</option><option>Nonaktif</option></select><label class="field-label" for="gatewayToken">Token API</label><input class="demo-input" id="gatewayToken" type="password" value="demo-token-not-connected" readonly><div class="settings-status"><span class="online-dot"></span><div><strong>Mode simulasi</strong><small>Tidak ada kredensial produksi yang tersimpan.</small></div></div><label class="toggle-row"><span><b>Template undangan</b><small>Gunakan template pesan contoh</small></span><input type="checkbox" checked></label><label class="toggle-row"><span><b>Pengingat H-1</b><small>Pratinjau opsi pengingat</small></span><input type="checkbox" checked></label></div>', button("Simpan Preferensi Demo", "save-settings"));
    }
    if (route === "audit") {
      return panel("Riwayat aktivitas", "Log ilustrasi untuk menunjukkan keterlacakan operasional.", table(["Waktu", "Pengguna", "Aktivitas", "Hasil"], [
        ["19 Okt 2026 · 08.45", "Admin Kesekretariatan", "Membuka dashboard", statusBadge("Aktif")],
        ["18 Okt 2026 · 16.20", "Super Admin", "Memeriksa konfigurasi demo", statusBadge("Aktif")],
        ["18 Okt 2026 · 10.05", "Admin Kesekretariatan", "Melihat agenda rapat", statusBadge("Aktif")]
      ]));
    }
    if (route === "konfigurasi") {
      return panel("Preferensi sistem", "Pengaturan presentasi untuk prototype, bukan konfigurasi server.", '<div class="settings-form"><label class="field-label" for="orgName">Nama organisasi</label><input class="demo-input" id="orgName" value="REDHUB · Organisasi Demo"><label class="field-label" for="term">Periode kepengurusan</label><select class="demo-input" id="term"><option>2025–2030</option><option>2030–2035</option></select><label class="toggle-row"><span><b>Mode kontras tinggi</b><small>Preferensi aksesibilitas demo</small></span><input type="checkbox"></label></div>', button("Simpan Preferensi", "save-settings"));
    }
    if (route === "qr-saya") {
      return '<section class="member-id-layout"><article class="member-id-card"><div class="member-id-brand"><span>RED<span>HUB</span></span><small>KARTU IDENTITAS DIGITAL</small></div><div class="member-id-profile"><div class="member-id-avatar">AP</div><div><h2>Andi Pratama</h2><p>Sekretaris · DPC Jember</p><span class="status present">Pengurus Aktif</span></div></div><div class="demo-qr" role="img" aria-label="Ilustrasi QR demo"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><strong class="member-id-code">RH-MBR-0001</strong><p class="demo-note">QR ilustrasi ini bukan token identitas yang dapat dipindai di sistem produksi.</p></article><aside class="analytics-card"><h3>Petunjuk check-in</h3><p class="subtitle">Tunjukkan QR kepada petugas saat hadir pada rapat.</p><ol class="step-list"><li><b>01</b><span>Buka halaman QR Saya.</span></li><li><b>02</b><span>Tunjukkan QR pada petugas scanner.</span></li><li><b>03</b><span>Pastikan status kehadiran telah tercatat.</span></li></ol></aside></section>';
    }
    if (route === "riwayat") {
      return panel("Riwayat kehadiran pribadi", "Contoh histori yang hanya terlihat oleh akun pengurus.", table(["Tanggal", "Agenda", "Unit", "Status"], [
        ["12 Okt 2026", "Rapat Koordinasi", "DPC", statusBadge("Hadir")],
        ["05 Okt 2026", "Evaluasi Program", "DPC", statusBadge("Hadir")],
        ["28 Sep 2026", "Konsolidasi Pengurus", "DPC", statusBadge("Terlambat")]
      ]));
    }
    if (route === "profil") {
      return panel("Profil saya", "Informasi akun dan jabatan aktif.", '<div class="profile-detail-grid"><div class="profile-detail-avatar">AP</div><div><span class="stat-label">NAMA LENGKAP</span><h3>Andi Pratama</h3><p class="subtitle">Nomor anggota RH-MBR-0001</p></div><div><span class="stat-label">UNIT ORGANISASI</span><strong>DPC Jember</strong></div><div><span class="stat-label">JABATAN AKTIF</span><strong>Sekretaris</strong></div><div><span class="stat-label">PERIODE</span><strong>2025–2030</strong></div><div><span class="stat-label">STATUS AKUN</span>' + statusBadge("Aktif") + '</div></div>');
    }
    return "";
  }
  function memberDashboard() {
    return '<section class="brand-stage member-welcome"><div class="brand-stage-copy"><div class="brand-stage-overline"><span class="brand-stage-pulse"></span> MEMBER WORKSPACE <span class="brand-stage-divider">/</span> PORTAL PENGURUS</div><h2>Selamat datang,<br><span>Andi Pratama.</span></h2><p>Pantau agenda, identitas digital, dan rekam kehadiran Anda dari satu tempat.</p><div class="brand-stage-tags"><span>01 <b>AGENDA</b></span><span>02 <b>QR SAYA</b></span><span>03 <b>RAPOR</b></span></div></div><div class="brand-stage-art"><div class="stage-core"><img class="stage-core-logo" src="Gemini_Generated_Image_7zhe497zhe497zhe-removebg-preview.png" alt="Logo REDHUB" width="88" height="88"></div><span class="stage-index">MEMBER—01</span></div></section><div class="stats generated-stats">' + metricCard("AGENDA MENDATANG", "02", "Rapat yang mengundang Anda", "") + metricCard("TINGKAT KEHADIRAN", "92%", "11 dari 12 agenda", "stat-present") + metricCard("STATUS PENGURUS", "Aktif", "DPC Jember · Sekretaris", "") + metricCard("PERIODE", "2025–30", "Masa jabatan aktif", "") + '</div>' + panel("Agenda terdekat", "Pastikan Anda mengetahui jadwal rapat berikutnya.", table(["Agenda", "Jadwal", "Status", "Aksi"], demoMeetings.slice(0, 2).map(function (m) { return [escapeHtml(m.title), escapeHtml(m.date), statusBadge(m.status), '<button class="button-small button-edit" data-action="meeting-detail">Lihat detail</button>']; })), '<div class="member-quick-actions"><button class="button-secondary" data-action="go-qr">▦ Buka QR Saya</button><button class="button-secondary" data-action="go-riwayat">Riwayat Kehadiran</button><button class="button-primary" data-action="go-rapor">Lihat Rapor Saya</button></div>');
  }
  let currentRole = null;
  let currentPage = "dashboard";
  let generatedView = document.getElementById("generatedPage");
  if (!generatedView) {
    generatedView = document.createElement("div");
    generatedView.id = "generatedPage";
    generatedView.className = "generated-page";
    main.insertBefore(generatedView, pageFooter || null);
  }
  const loginScreen = document.createElement("section");
  loginScreen.id = "loginScreen";
  loginScreen.className = "login-screen";
  loginScreen.innerHTML = '<div class="login-ambient ambient-one"></div><div class="login-ambient ambient-two"></div><div class="login-shell"><section class="login-brand"><a class="login-logo" href="#" aria-label="REDHUB"><img src="Gemini_Generated_Image_7zhe497zhe497zhe-removebg-preview.png" alt="Logo REDHUB"><span>RED<span>HUB</span><small>TERHUBUNG TERUKUR</small></span></a><div class="login-brand-copy"><p class="login-kicker"><span class="brand-stage-pulse"></span> ORGANIZATION PLATFORM</p><h1>Terhubung dalam struktur.<br><span>Terukur dalam kehadiran.</span></h1><p>Kelola struktur organisasi, agenda, dan kehadiran melalui satu ruang kerja yang terintegrasi.</p><div class="login-brand-meta"><span>01 / KEANGGOTAAN</span><span>02 / KEHADIRAN</span><span>03 / PELAPORAN</span></div></div><div class="login-brand-footer"><span>REDHUB ORGANIZATION PLATFORM</span><span>ORGANIZATION WORKSPACE</span></div></section><section class="login-form-side"><div class="login-form-wrap"><div class="login-mobile-brand"><img src="Gemini_Generated_Image_7zhe497zhe497zhe-removebg-preview.png" alt=""><span>RED<span>HUB</span></span></div><p class="section-kicker">SELAMAT DATANG</p><h2>Masuk ke REDHUB</h2><p class="login-intro">Masuk menggunakan akun organisasi Anda untuk melanjutkan.</p><form id="demoLoginForm"><label class="field-label" for="loginEmail">Email</label><input class="demo-input" id="loginEmail" name="email" type="email" placeholder="nama@organisasi.id" autocomplete="username" required><label class="field-label" for="loginPassword">Kata sandi</label><div class="password-wrap"><input class="demo-input" id="loginPassword" name="password" type="password" placeholder="Masukkan kata sandi" autocomplete="current-password" required></div><button class="button-primary login-submit" type="submit">Masuk <span>→</span></button></form><p class="login-copyright">© REDHUB · Terhubung &amp; Terukur</p></div></section></div>';
  body.insertBefore(loginScreen, body.firstChild);
  body.classList.add("auth-required");

  function showLogin() {
    body.classList.add("auth-required");
    loginScreen.hidden = false;
  }
  function renderNav() {
    navList.innerHTML = navByRole[currentRole].map(function (item) {
      return '<a class="nav-item" href="#" data-page="' + item[0] + '">' + svgIcon(item[2]) + '<span>' + item[1] + '</span></a>';
    }).join("");
    const bottom = document.querySelector(".sidebar-bottom");
    if (bottom) {
      const card = bottom.querySelector(".workspace-card");
      if (card) {
        card.querySelector("strong").textContent = roleLabels[currentRole];
        card.querySelector("small").textContent = "Ruang kerja organisasi";
      }
      const footer = bottom.querySelector(".sidebar-footer span:last-child");
      if (footer) footer.innerHTML = 'REDHUB <small>ORGANIZATION PLATFORM</small>';
    }
  }
  function updateProfile() {
    const profile = document.querySelector(".profile");
    if (!profile) return;
    profile.innerHTML = '<div class="avatar">' + (currentRole === "super_admin" ? "S" : currentRole === "admin" ? "A" : "P") + '</div><div class="profile-copy"><strong>' + roleLabels[currentRole] + '</strong><small>' + (currentRole === "pengurus" ? "Andi Pratama" : "Akses organisasi") + '</small></div><button type="button" class="profile-logout" data-action="logout" aria-label="Keluar dari akun">↪</button>';
  }
  function setHeader(route) {
    const meta = pageMeta[route] || pageMeta.dashboard;
    const crumb = document.querySelector(".breadcrumb");
    if (crumb) crumb.innerHTML = '<span>Workspace</span><span class="breadcrumb-separator">/</span><strong>' + meta[0] + '</strong>';
    const eyebrow = document.querySelector(".page-heading .eyebrow");
    const h1 = document.querySelector(".page-heading h1");
    const subtitle = document.querySelector(".page-heading .subtitle");
    if (eyebrow) eyebrow.textContent = meta[1];
    if (h1) h1.innerHTML = meta[0] + (route === "dashboard" && currentRole !== "pengurus" ? ' <span>Absensi</span>' : "");
    if (subtitle) subtitle.textContent = meta[2];
    updateProfile();
  }
  function goToPage(route) {
    if (!currentRole) return;
    const permitted = navByRole[currentRole].some(function (item) { return item[0] === route; });
    if (!permitted) route = "dashboard";
    currentPage = route;
    const isAdminDashboard = route === "dashboard" && currentRole !== "pengurus";
    const isMemberDashboard = route === "dashboard" && currentRole === "pengurus";
    if (brandStage) brandStage.style.display = isAdminDashboard ? "" : "none";
    if (overviewSection) overviewSection.style.display = isAdminDashboard ? "" : "none";
    if (analyticsSection) analyticsSection.style.display = route === "dashboard" || route === "laporan" ? (isAdminDashboard && route === "dashboard" ? "" : "none") : "none";
    if (membersPanel) membersPanel.style.display = route === "anggota" ? "" : "none";
    generatedView.style.display = "none";
    generatedView.innerHTML = "";
    if (isMemberDashboard) {
      generatedView.style.display = "";
      generatedView.innerHTML = memberDashboard();
    } else if (!isAdminDashboard && route !== "anggota") {
      generatedView.style.display = "";
      generatedView.innerHTML = pageContent(route, currentRole);
    }
    if (route === "anggota" && membersPanel) {
      const panelHeading = membersPanel.querySelector(".panel-heading h2");
      const panelSubtitle = membersPanel.querySelector(".panel-heading .subtitle");
      if (panelHeading) panelHeading.textContent = "Pengurus & Anggota";
      if (panelSubtitle) panelSubtitle.textContent = "Kelola identitas, unit, jabatan, dan status kehadiran anggota.";
    }
    navList.querySelectorAll(".nav-item").forEach(function (link) {
      const active = link.dataset.page === route;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    setHeader(route);
    if (window.matchMedia("(max-width: 900px)").matches) body.classList.remove("mobile-nav-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function login(role) {
    currentRole = role;
    try { localStorage.setItem(ROLE_KEY, role); } catch (error) {}
    body.classList.remove("auth-required");
    loginScreen.hidden = true;
    renderNav();
    goToPage("dashboard");
    // Opening the workspace already confirms successful demo sign-in;
    // avoid a redundant toast covering mobile dashboard content.
  }
  function logout() {
    currentRole = null;
    try { localStorage.removeItem(ROLE_KEY); } catch (error) {}
    showLogin();
    window.scrollTo({ top: 0, behavior: "smooth" });
    const emailField = document.getElementById("loginEmail");
    if (emailField) emailField.focus();
  }
  document.getElementById("demoLoginForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const accountName = email.split("@")[0].toLowerCase();
    const role = accountName.startsWith("superadmin") ? "super_admin" : accountName.startsWith("admin") ? "admin" : "pengurus";
    if (!email || !password) {
      toast("Lengkapi email dan kata sandi untuk melanjutkan.", "error");
      return;
    }
    login(role);
  });
  navList.addEventListener("click", function (event) {
    const link = event.target.closest("[data-page]");
    if (!link) return;
    event.preventDefault();
    goToPage(link.dataset.page);
  });
  document.addEventListener("click", function (event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === "logout") { logout(); return; }
    if (action === "toggle-password") {
      const input = document.getElementById("loginPassword");
      if (input) { input.type = input.type === "password" ? "text" : "password"; actionEl.textContent = input.type === "password" ? "Lihat" : "Sembunyi"; }
      return;
    }
    if (action === "go-qr") { goToPage("qr-saya"); return; }
    if (action === "go-riwayat") { goToPage("riwayat"); return; }
    if (action === "go-rapor") { goToPage("rapor-saya"); return; }
    if (action === "new-unit") { toast("Form unit baru siap ditambahkan pada integrasi berikutnya."); return; }
    if (action === "new-meeting") { toast("Mode demo: alur formulir rapat ditampilkan sebagai simulasi."); return; }
    if (action === "meeting-detail") { toast("Detail agenda demo dibuka. Tidak ada data produksi yang diakses."); return; }
    if (action === "detail-struktur") { toast("Detail unit organisasi demo."); return; }
    if (action === "new-admin") { toast("Mode demo: pembuatan akun administratif tidak mengubah akun sungguhan."); return; }
    if (action === "admin-detail") { toast("Pengelolaan akun hanya simulasi UI."); return; }
    if (action === "save-settings") { toast("Preferensi demo ditampilkan; tidak ada konfigurasi server yang diubah.", "success"); return; }
    if (action === "scan-member") {
      const field = document.getElementById("scanMemberId");
      if (!field || !field.value.trim()) { toast("Masukkan ID anggota demo terlebih dahulu.", "error"); return; }
      toast("Identitas demo ditemukan. Check-in tidak dikirim ke backend.", "success");
      return;
    }
    if (action === "send-invitation") {
      const file = document.getElementById("invitationPdf");
      if (!file || !file.files || !file.files.length) { toast("Pilih berkas PDF sebelum menjalankan simulasi.", "error"); return; }
      toast("Simulasi selesai: 31 penerima demo. Tidak ada WhatsApp terkirim.", "success");
      return;
    }
    if (action === "toggle-attendance") {
      const index = Number(actionEl.dataset.row);
      if (!Number.isInteger(index) || !demoAttendance[index]) return;
      demoAttendance[index][3] = demoAttendance[index][3] === "Hadir" ? "Belum Absen" : "Hadir";
      goToPage("absensi");
      toast("Status demo diperbarui untuk sesi ini.", "success");
      return;
    }
    if (action === "export-attendance" || action === "export-report") {
      const csv = "Nama;Unit;Jabatan;Status\r\n" + demoAttendance.map(function (row) { return row.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(";"); }).join("\r\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a"); a.href = url; a.download = "redhub-laporan-demo.csv"; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast("File CSV demo disiapkan.", "success");
      return;
    }
    if (action === "print-report") { window.print(); return; }
  });
  document.addEventListener("change", function (event) {
    if (event.target && event.target.id === "invitationPdf") {
      const file = event.target.files && event.target.files[0];
      const label = document.getElementById("pdfName");
      if (label) label.textContent = file ? file.name : "Belum ada berkas dipilih.";
      const ready = document.getElementById("distributionReady");
      if (ready && file) ready.textContent = "31 penerima · siap ditinjau";
    }
  });
  document.addEventListener("input", function (event) {
    if (!event.target || event.target.id !== "attendanceSearch") return;
    const query = event.target.value.toLowerCase().trim();
    const rows = generatedView.querySelectorAll(".generated-table-wrap tbody tr");
    rows.forEach(function (row) { row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none"; });
  });
  const mobileToggle = document.createElement("button");
  mobileToggle.className = "mobile-nav-toggle";
  mobileToggle.type = "button";
  mobileToggle.setAttribute("aria-label", "Buka navigasi");
  mobileToggle.setAttribute("aria-expanded", "false");
  mobileToggle.innerHTML = '<span></span><span></span><span></span>';
  topbar.insertBefore(mobileToggle, topbar.firstChild);
  mobileToggle.addEventListener("click", function () {
    const opened = body.classList.toggle("mobile-nav-open");
    mobileToggle.setAttribute("aria-expanded", String(opened));
    mobileToggle.setAttribute("aria-label", opened ? "Tutup navigasi" : "Buka navigasi");
  });
  document.addEventListener("click", function (event) {
    if (!body.classList.contains("mobile-nav-open")) return;
    if (event.target.closest(".sidebar") || event.target.closest(".mobile-nav-toggle")) return;
    body.classList.remove("mobile-nav-open");
    mobileToggle.setAttribute("aria-expanded", "false");
    mobileToggle.setAttribute("aria-label", "Buka navigasi");
  });
  const profileEl = document.querySelector(".profile");
  if (profileEl) profileEl.setAttribute("aria-label", "Akun REDHUB");

  let savedRole = null;
  try { savedRole = localStorage.getItem(ROLE_KEY); } catch (error) {}
  if (savedRole && navByRole[savedRole]) login(savedRole);
  else showLogin();
})();
