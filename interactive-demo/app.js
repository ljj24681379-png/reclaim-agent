const SAMPLE_RECORDS = `[保险邮件] 2026-03-18，国寿鑫盈年金保险已满期，满期保险金 48000 元。截至 2026-08-28 账户未收到对应入账，保单号 PL202103180026。

[航旅短信] CA1836 北京首都至上海虹桥，计划 14:20 起飞，实际 18:32 起飞，延误 4 小时 12 分。航空公司短信标注“机务原因”，已实际乘机，登机牌已保存。

[支付账单] 某影音会员自 2026-04 起每月自动扣费 25 元，共 5 期，合计 125 元。
[邮箱检索] 每期扣费前 7 日内，“续费”“自动扣费”“到期”提醒邮件命中 0 条；短信命中 0 条。

[订单] 手机壳购买价 39 元，活动后同款价格 36 元，价保差额 3 元，申请人工价保预计需 8 分钟。`;

const RULES = [
  {
    id: "insurance-maturity",
    title: "保单满期金未领取",
    domain: "保险·满期给付",
    matches: text => /(保险|保单)/.test(text) && /(满期|生存金)/.test(text) && /(未收到|未领取|未入账)/.test(text),
    amount: text => numberNear(text, /(满期保险金|满期金|生存金)/, 48000),
    probability: .88,
    cost: 18,
    certainty: "高可行",
    certaintyClass: "ready",
    basis: "给付请求最终必须回到用户本人的保险合同与保险公司核验结果；监管专项数据证明这类未领取权益大量存在，但不替代具体合同。",
    sourceName: "国家金融监督管理总局·睡眠保单清理专项",
    sourceUrl: "https://www.nfra.gov.cn/cn/view/pages/ItemDetail.html?docId=1162174&itemId=915",
    evidence: ["保单合同与满期给付条款", "保单号及投保人身份核验", "满期日后未入账的账户记录"],
    missing: ["需在正式发出前核验保单当前状态、受益人与实际应付金额"],
    authorization: "L2 显式授权",
    action: "向保险公司官方渠道提交满期给付材料包",
    draft: data => `主题：满期保险金给付申请（待本人确认）\n\n本人名下保单已于记录所示日期满期，当前账户记录中未见对应给付入账。\n\n请核验：\n1. 保单当前状态与满期给付责任；\n2. 实际应给付金额（当前记录为 ¥${money(data.amount)}）；\n3. 所需材料及预计办结时间。\n\n附件：保单摘要、身份核验材料清单、未入账记录。`
  },
  {
    id: "flight-delay",
    title: "承运人原因航班延误",
    domain: "航旅·延误补偿",
    matches: text => /(航班|CA\d{3,4})/.test(text) && /(延误|delay)/i.test(text) && /(机务|承运人原因|航空公司原因)/.test(text) && /4\s*小时/.test(text),
    amount: () => 200,
    probability: .82,
    cost: 6.4,
    certainty: "高可行",
    certaintyClass: "ready",
    basis: "国航 2026 年 4 月版《旅客、行李运输总条件》约定：国航原因造成、延误 4–8 小时且已实际乘机，每位旅客补偿 200 元。是否属于承运人原因仍需官方核验。",
    sourceName: "中国国际航空·旅客、行李运输总条件（2026 年 4 月版）",
    sourceUrl: "https://webresource.airchina.com.cn/zh-CN/content/trans_conditions/lk-xlysztj2023n9yb/",
    evidence: ["电子客票与登机牌", "计划/实际起飞时间", "承运人发送的延误原因记录"],
    missing: ["正式申请前应由承运人再次确认延误原因"],
    authorization: "L1 保存；L2 对外提交",
    action: "按承运人官方投诉渠道提交补偿申请",
    draft: data => `主题：航班延误补偿申请（待本人确认）\n\n本人乘坐记录中的 CA1836 航班，实际出港延误 4 小时 12 分，已实际乘机。当前记录显示原因为“机务原因”。\n\n依据贵司现行运输总条件第 8.3.1 条，现申请核验本次延误原因及 ¥${money(data.amount)} 补偿资格。\n\n附件：电子客票、登机牌、延误通知与实际起飞时间记录。\n\n请在收到投诉之日起 10 个工作日内给出包含解决方案的处理结果。`
  },
  {
    id: "auto-renewal",
    title: "自动续费显著提醒缺失",
    domain: "订阅·退费协商",
    matches: text => /(自动扣费|自动续费|自动展期)/.test(text) && /(命中\s*0|未收到|无.*提醒)/.test(text),
    amount: text => numberNear(text, /(合计|共扣费)/, 125),
    probability: .45,
    cost: 8,
    certainty: "需要补证",
    certaintyClass: "review",
    basis: "《消费者权益保护法实施条例》第十条要求经营者在自动续费日期前以显著方式提醒。这能支持要求经营者提供送达记录并开展退费协商，但不等于法律已经直接规定全额退款。",
    sourceName: "中国政府网·消费者权益保护法实施条例",
    sourceUrl: "https://app.www.gov.cn/govdata/gov/202403/19/513111/article.html",
    evidence: ["连续扣费账单", "邮箱与短信检索范围", "会员服务的取消状态"],
    missing: ["平台可能掌握 App 站内信或推送的送达记录，当前样本无法覆盖", "退费范围需根据实际使用情况协商"],
    authorization: "L1 询问送达记录；L2 正式投诉",
    action: "先要求平台提供显著提醒的送达记录，再决定退费协商或投诉",
    draft: data => `主题：请提供自动续费提醒送达记录（待本人确认）\n\n本账户记录显示连续 5 期自动扣费，合计 ¥${money(data.amount)}。在已授权检索的邮箱与短信中，每期扣费前 7 日内未找到续费提醒。\n\n依据《消费者权益保护法实施条例》第十条，请提供各期扣费前以显著方式提醒消费者的具体送达记录。\n\n如无法提供，请根据本账户的实际使用情况与本人协商退费方案，并关闭自动续费。\n\n注：本文书不预设全额退费结论。`
  },
  {
    id: "price-protection",
    title: "订单价保差额",
    domain: "电商·价格保护",
    matches: text => /(价保|差额)/.test(text) && /(订单|购买价)/.test(text),
    amount: text => numberNear(text, /(价保差额|差额)/, 3),
    probability: .9,
    cost: 5,
    certainty: "低价值折叠",
    certaintyClass: "suppressed",
    basis: "该类权益来自具体平台的价保规则，必须核验同款商品、优惠类型与申请时限。当前样本只用于演示 EV 闸门。",
    sourceName: "具体购买平台的实时价保规则（待核验）",
    sourceUrl: "",
    evidence: ["原订单与支付价", "同款商品活动价", "平台价保规则和时限"],
    missing: ["未提供平台和商品链接，无法校验规则"],
    authorization: "L0 折叠展示",
    action: "不主动打扰；仅在用户查看低价值队列时展示",
    draft: data => `当前价保差额为 ¥${money(data.amount)}，低于主动打扰阈值。建议不主动发起人工申请。`
  }
];

const state = {
  findings: [], selectedId: null, actionId: null,
  audit: JSON.parse(localStorage.getItem("reclaimAudit") || "[]")
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const recordsInput = $("#recordsInput");
const thresholdInput = $("#evThreshold");

function money(value) { return Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 }); }
function numberNear(text, marker, fallback) {
  const hit = text.match(new RegExp(`${marker.source}[^\\d]{0,18}([\\d,]+(?:\\.\\d+)?)\\s*元`));
  return hit ? Number(hit[2].replaceAll(",", "")) : fallback;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
}
function addAudit(type, detail) {
  state.audit.unshift({ time: new Date().toLocaleString("zh-CN", { hour12: false }), type, detail });
  state.audit = state.audit.slice(0, 60);
  localStorage.setItem("reclaimAudit", JSON.stringify(state.audit));
  renderAudit();
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2300);
}
function updateRecordStats() {
  const text = recordsInput.value.trim();
  const blocks = text ? text.split(/\n\s*\n/).filter(Boolean).length : 0;
  $("#recordStats").textContent = `${blocks} 组记录 · ${text.length} 字符 · 尚未上传`;
}
function switchView(name) {
  $$(".step").forEach(button => button.classList.toggle("is-active", button.dataset.view === name));
  $$(".view").forEach(view => view.classList.toggle("is-active", view.id === `view-${name}`));
  $(".workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}
function runScan() {
  const text = recordsInput.value.trim();
  if (!text) { showToast("请先粘贴或恢复一组记录。"); return; }
  const button = $("#scanBtn");
  button.disabled = true;
  button.innerHTML = `<span>正在交叉核验记录与规则…</span><small>本地</small>`;
  const progress = document.createElement("div");
  progress.className = "scan-progress";
  progress.innerHTML = "<span></span>";
  button.before(progress);
  window.setTimeout(() => {
    const threshold = Number(thresholdInput.value);
    state.findings = RULES.filter(rule => rule.matches(text)).map(rule => {
      const amount = rule.amount(text);
      const ev = amount * rule.probability - rule.cost;
      const suppressed = ev < threshold || rule.certaintyClass === "suppressed";
      return { ...rule, amount, ev, suppressed };
    }).sort((a, b) => b.ev - a.ev);
    state.selectedId = state.findings.find(item => !item.suppressed)?.id || state.findings[0]?.id || null;
    button.disabled = false;
    button.innerHTML = `<span>扫描可兑现权益</span><small>预计 3 秒</small>`;
    progress.remove();
    renderFindings();
    addAudit("发现", `完成本地扫描：命中 ${state.findings.length} 项规则，${state.findings.filter(item => item.suppressed).length} 项被 EV 闸门折叠。`);
    switchView("findings");
  }, 1050);
}
function renderFindings() {
  const active = state.findings.filter(item => !item.suppressed);
  const suppressed = state.findings.filter(item => item.suppressed);
  $("#findingCount").textContent = active.length;
  $("#findingCount").classList.toggle("has-count", active.length > 0);
  const total = active.reduce((sum, item) => sum + item.amount, 0);
  $("#findingSummary").textContent = state.findings.length
    ? `命中 ${state.findings.length} 项候选：${active.length} 项进入主动队列，涉及金额 ¥${money(total)}；${suppressed.length} 项因价值过低或证据不足被折叠。`
    : "未命中当前 MVP 的规则。这不代表一定没有权益，只表示系统没有足够证据做出主动提示。";
  $("#findingList").innerHTML = state.findings.length ? state.findings.map(item => `
    <button type="button" class="finding-card ${state.selectedId === item.id ? "is-selected" : ""}" data-finding="${item.id}">
      <span class="finding-top"><span class="finding-title">${escapeHtml(item.title)}</span><span class="amount">¥${money(item.amount)}</span></span>
      <span class="finding-meta">${escapeHtml(item.domain)} · EV ¥${money(item.ev)}</span>
      <span class="status-pill ${item.suppressed ? "suppressed" : item.certaintyClass}">${item.suppressed ? "未进入主动队列" : escapeHtml(item.certainty)}</span>
    </button>`).join("") : `<div class="empty-state"><span>∅</span><p>没有可以负责任地推送的结果。</p></div>`;
  $$('[data-finding]').forEach(button => button.addEventListener("click", () => {
    state.selectedId = button.dataset.finding;
    renderFindings();
  }));
  renderFindingDetail();
}
function renderFindingDetail() {
  const item = state.findings.find(finding => finding.id === state.selectedId);
  if (!item) return;
  $("#findingDetail").innerHTML = `
    <div class="detail-head">
      <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.domain)} · 规则 ${escapeHtml(item.id)}</p></div>
      <div class="detail-amount"><strong>¥${money(item.amount)}</strong><span>候选涉及金额</span></div>
    </div>
    <div class="decision-strip">
      <div><span>历史/先验成功概率</span><strong>${Math.round(item.probability * 100)}%</strong></div>
      <div><span>预计执行成本</span><strong>¥${money(item.cost)}</strong></div>
      <div><span>预期净价值 EV</span><strong>¥${money(item.ev)}</strong></div>
    </div>
    ${item.certaintyClass === "review" ? `<div class="warning-note">这是“可协商信号”，不是“必然退款结论”。Agent 已自动降级表述。</div>` : ""}
    <div class="detail-block"><h4>判定依据</h4><p>${escapeHtml(item.basis)}</p>${item.sourceUrl ? `<p><a href="${item.sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceName)} ↗</a></p>` : `<p>${escapeHtml(item.sourceName)}</p>`}</div>
    <div class="detail-block"><h4>已命中的证据</h4><ul>${item.evidence.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>
    <div class="detail-block"><h4>仍需核验</h4><ul>${item.missing.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>
    <div class="detail-block"><h4>行动边界</h4><p>${escapeHtml(item.action)}。授权级别：${escapeHtml(item.authorization)}。</p></div>
    <button class="primary-action detail-action" id="prepareActionBtn" type="button" ${item.suppressed ? "disabled" : ""}>${item.suppressed ? "低于主动打扰阈值" : "准备行动包"}</button>`;
  const prepare = $("#prepareActionBtn");
  if (!item.suppressed) prepare.addEventListener("click", () => prepareAction(item.id));
}
function prepareAction(id) {
  state.actionId = id;
  const item = state.findings.find(finding => finding.id === id);
  addAudit("材料", `为“${item.title}”生成待确认行动包，未发送。`);
  renderAction();
  switchView("action");
}
function renderAction() {
  const item = state.findings.find(finding => finding.id === state.actionId);
  if (!item) return;
  $("#actionWorkspace").innerHTML = `
    <div class="action-grid">
      <aside class="action-sidebar">
        <h3>${escapeHtml(item.title)}</h3>
        <p>当前是“材料已准备”状态，没有任何对外操作。</p>
        ${[
          ["证", "证据 Agent", "对照规则检查已有材料与缺口"],
          ["规", "条款 Agent", "锁定具体条款版本与适用条件"],
          ["书", "文书 Agent", "只使用可证明事实生成草稿"],
          ["闸", "合规闸门", "拦截伪造、越权、过度承诺与个资泄露"],
          ["跟", "追踪 Agent", "仅在用户确认后创建时限与升级计划"]
        ].map(([dot, name, desc]) => `<div class="agent-lane"><span class="lane-dot">${dot}</span><div><strong>${name}</strong><p>${desc}</p></div></div>`).join("")}
      </aside>
      <section class="package">
        <h3>待确认行动包</h3>
        <p>草稿不包含真实身份证号、银行账户或其他敏感信息。</p>
        <div class="draft">${escapeHtml(item.draft(item))}</div>
        <div class="evidence-checklist">
          ${item.evidence.map((e, index) => `<label><input type="checkbox" ${index < 2 ? "checked" : ""}> <span>${escapeHtml(e)}</span></label>`).join("")}
        </div>
        <div class="package-actions">
          <button class="secondary-action" id="exportJsonBtn" type="button">导出可审计 JSON</button>
          <button class="secondary-action" id="copyDraftBtn" type="button">复制草稿</button>
        </div>
        <div class="authorization-box">
          <label><input type="checkbox" id="authorizationCheck"> <span>我已阅读依据、证据缺口和不确定性，同意将此项加入“待发送”队列。此 MVP 不会真实联系外部机构。</span></label>
          <button class="primary-action" id="authorizeBtn" type="button">确认授权边界</button>
        </div>
      </section>
    </div>`;
  $("#copyDraftBtn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(item.draft(item));
    addAudit("导出", `复制“${item.title}”的待确认草稿。`);
    showToast("草稿已复制。");
  });
  $("#exportJsonBtn").addEventListener("click", () => exportPackage(item));
  $("#authorizeBtn").addEventListener("click", () => {
    if (!$("#authorizationCheck").checked) { showToast("请先确认你已阅读授权边界。"); return; }
    addAudit("授权", `已确认“${item.title}”的 ${item.authorization} 边界；MVP 未执行对外提交。`);
    showToast("已记录授权边界；演示环境未对外发送。");
    switchView("audit");
  });
}
function exportPackage(item) {
  const payload = {
    product: "Reclaim portfolio MVP", generated_at: new Date().toISOString(),
    simulation_only: true, finding: { id: item.id, title: item.title, domain: item.domain, amount: item.amount, expected_value: Number(item.ev.toFixed(2)), prior_probability: item.probability },
    basis: { summary: item.basis, source_name: item.sourceName, source_url: item.sourceUrl },
    evidence: item.evidence, unresolved: item.missing, authorization: item.authorization,
    action: item.action, draft: item.draft(item)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `reclaim-${item.id}-evidence-pack.json`; link.click();
  URL.revokeObjectURL(url);
  addAudit("导出", `导出“${item.title}”可审计 JSON 材料包。`);
  showToast("材料包已导出。");
}
function renderAudit() {
  $("#auditLog").innerHTML = state.audit.length ? state.audit.map(row => `
    <div class="audit-row"><time>${escapeHtml(row.time)}</time><strong>${escapeHtml(row.type)}</strong><span>${escapeHtml(row.detail)}</span></div>`).join("")
    : `<div class="empty-state"><span>·</span><p>还没有审计记录。从一次本地扫描开始。</p></div>`;
}

recordsInput.value = SAMPLE_RECORDS;
updateRecordStats();
renderAudit();
recordsInput.addEventListener("input", updateRecordStats);
thresholdInput.addEventListener("input", () => $("#thresholdValue").textContent = `¥${thresholdInput.value}`);
$("#loadSampleBtn").addEventListener("click", () => { recordsInput.value = SAMPLE_RECORDS; updateRecordStats(); showToast("已恢复演示样本。"); });
$("#clearBtn").addEventListener("click", () => { recordsInput.value = ""; updateRecordStats(); });
$("#scanBtn").addEventListener("click", runScan);
$("#startScanBtn").addEventListener("click", () => { switchView("source"); window.setTimeout(runScan, 320); });
$("#rescanBtn").addEventListener("click", () => switchView("source"));
$("#clearAuditBtn").addEventListener("click", () => { state.audit = []; localStorage.removeItem("reclaimAudit"); renderAudit(); showToast("本地审计记录已清除。"); });
$$(".step").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));

