export default function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
    }}>
      <img
        src="/logo.png"
        alt="Andy Models"
        style={{ height: 60, marginBottom: 48, objectFit: 'contain' }}
      />
      <p style={{
        fontSize: 11,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: '#999',
        margin: 0,
      }}>
        Estamos em breve manutenção
      </p>
      <p style={{
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#bbb',
        marginTop: 8,
      }}>
        Retornaremos em minutos
      </p>
    </div>
  );
}
