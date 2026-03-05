import formidable from 'formidable';
import nodemailer from 'nodemailer';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Honeypot anti-spam
  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });

  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ error: 'Erro ao processar arquivo. Verifique o tamanho (máx 20MB).' });
  }

  const arquivo = files.arquivo?.[0];
  if (!arquivo) {
    return res.status(400).json({ error: 'Nenhum arquivo recebido.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Portal Kleber Moreira" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO,
      subject: `📎 Nova petição recebida: ${arquivo.originalFilename}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px;">
          <h2 style="color: #0d0d0d;">Nova petição recebida</h2>
          <p>Um novo arquivo foi enviado pelo portal.</p>
          <table style="border-collapse:collapse; width:100%; margin-top:16px;">
            <tr>
              <td style="padding:8px; background:#f7f6f3; font-weight:600; border:1px solid #e5e4e0;">Arquivo</td>
              <td style="padding:8px; border:1px solid #e5e4e0;">${arquivo.originalFilename}</td>
            </tr>
            <tr>
              <td style="padding:8px; background:#f7f6f3; font-weight:600; border:1px solid #e5e4e0;">Tamanho</td>
              <td style="padding:8px; border:1px solid #e5e4e0;">${(arquivo.size / 1024).toFixed(1)} KB</td>
            </tr>
            <tr>
              <td style="padding:8px; background:#f7f6f3; font-weight:600; border:1px solid #e5e4e0;">Tipo</td>
              <td style="padding:8px; border:1px solid #e5e4e0;">${arquivo.mimetype}</td>
            </tr>
            <tr>
              <td style="padding:8px; background:#f7f6f3; font-weight:600; border:1px solid #e5e4e0;">Recebido em</td>
              <td style="padding:8px; border:1px solid #e5e4e0;">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
            </tr>
          </table>
          <p style="margin-top:16px; color:#888; font-size:12px;">Enviado via Portal de Petições — Kleber Moreira Advocacia</p>
        </div>
      `,
      attachments: [
        {
          filename: arquivo.originalFilename,
          path: arquivo.filepath,
        },
      ],
    });

    // Limpa arquivo temporário
    fs.unlink(arquivo.filepath, () => {});

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    return res.status(500).json({ error: 'Erro ao enviar e-mail. Tente novamente.' });
  }
}
