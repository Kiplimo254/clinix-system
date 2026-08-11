import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--clr-bg)', color: 'var(--clr-text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'linear-gradient(135deg, var(--clr-primary-500), var(--clr-primary-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Activity size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>Clinix Privacy Policy</h1>
            <p style={{ margin: 0, color: 'var(--clr-text-muted)', fontSize: '0.85rem' }}>Last updated: {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ lineHeight: 1.8, color: 'var(--clr-text-secondary)' }}>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--clr-text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>1. Introduction</h2>
            <p>Clinix is a clinic management system that stores and processes patient health data on behalf of registered clinics. We are committed to protecting the privacy and security of patient data in accordance with the <strong>Kenya Data Protection Act, 2019</strong> and applicable health data regulations.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--clr-text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>2. Data We Collect</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Patient demographic information (name, date of birth, gender, national ID, phone, address)</li>
              <li>Clinical records including visit notes, diagnoses, and prescriptions</li>
              <li>Appointment history</li>
              <li>Payment records</li>
              <li>Staff authentication credentials and access logs</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--clr-text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>3. Basis for Processing</h2>
            <p>Patient data is processed on the basis of:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Consent</strong> — captured at patient registration</li>
              <li><strong>Legitimate clinical interest</strong> — necessary for the provision of healthcare services</li>
              <li><strong>Legal obligation</strong> — to comply with Kenya's public health and data protection requirements</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--clr-text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>4. Data Security</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>All data is transmitted over HTTPS/TLS</li>
              <li>Authentication tokens stored in httpOnly secure cookies, not browser storage</li>
              <li>Role-based access control — clinical notes accessible only to authorised staff</li>
              <li>Access to diagnosis records by receptionists requires explicit doctor approval, which is logged</li>
              <li>Daily automated database backups with tested restore procedures</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--clr-text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>5. Your Rights (Patients)</h2>
            <p>Under the Kenya Data Protection Act, you have the right to:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Access</strong> — request a copy of your personal data held by the clinic</li>
              <li><strong>Correction</strong> — request correction of inaccurate information</li>
              <li><strong>Erasure</strong> — request deletion or anonymisation of your data (subject to clinical record-keeping obligations)</li>
              <li><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
            </ul>
            <p>To exercise any of these rights, contact your clinic's administrator directly.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--clr-text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>6. Data Retention</h2>
            <p>Clinical records are retained as required by Kenyan health regulations (minimum 5 years for adult records, longer for minors). Records may be anonymised upon patient request, but complete erasure of clinical notes may not always be possible where required for legal or safety purposes.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--clr-text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>7. Third Parties</h2>
            <p>Clinix uses <strong>Africa's Talking</strong> to send appointment reminder SMS messages. Only the patient's phone number and appointment time are shared for this purpose. No data is sold or shared with any other third party.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--clr-text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>8. Contact</h2>
            <p>For data protection queries, contact the clinic's administrator or reach us at <a href="mailto:privacy@clinix.app" style={{ color: 'var(--clr-primary-400)' }}>privacy@clinix.app</a>.</p>
          </section>
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--clr-border)', display: 'flex', gap: '1rem' }}>
          <Link to="/login" className="btn btn-ghost">← Back to Login</Link>
          <Link to="/signup" className="btn btn-ghost">← Back to Signup</Link>
        </div>
      </div>
    </div>
  );
}
