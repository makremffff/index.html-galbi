import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ضع توكن البوت الحقيقي هنا
const BOT_TOKEN = "8482874983:AAHWOAaylS4VUuNv8a4JvB-8KWtLdKnlQqI";
const TG = "https://api.telegram.org/bot" + BOT_TOKEN;

// نخزن روابط الفواتير حسب اسمها كما في HTML
let invoices = {
  invoice_10: null,
  invoice_20: null,
  invoice_30: null,
  invoice_40: null
};

// -------- إنشاء فاتورة فعلية ----------
async function generateInvoice(amount) {
  const payload = {
    title: `${amount} Stars`,
    description: `Purchase ${amount} stars`,
    currency: "XTR",
    prices: [
      { label: `${amount} Stars`, amount: amount * 100 }
    ],
    payload: "stars_" + amount
  };

  const res = await axios.post(`${TG}/createInvoiceLink`, payload);
  return res.data.result;
}

// -------- إنشاء الفواتير عند تشغيل السيرفر ----------
async function initInvoices() {
  invoices.invoice_10 = await generateInvoice(10);
  invoices.invoice_20 = await generateInvoice(20);
  invoices.invoice_30 = await generateInvoice(30);
  invoices.invoice_40 = await generateInvoice(40);

  console.log("All invoices generated ✓");
}

// -------- API يرجع invoice link حسب الاسم الموجود في HTML ----------
app.get("/invoice/:id", (req, res) => {
  const id = req.params.id;

  if (!invoices[id]) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  res.json({ invoice: invoices[id] });
});

app.listen(3000, () => {
  console.log("Backend running on port 3000");
  initInvoices();
});