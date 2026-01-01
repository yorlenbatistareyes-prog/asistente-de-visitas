<script lang="ts">
  // Aquí irá la lógica (importar datos de visitas, etc.)
</script>

<div class="page-container">
  <header class="section-header">
    <h2>Resumen de Actividad</h2>
    <p>Tienes 3 visitas pendientes para esta semana</p>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <span class="label">Total Visitas</span>
      <span class="value">24</span>
    </div>
    <div class="stat-card">
      <span class="label">Revisitas</span>
      <span class="value">12</span>
    </div>
  </div>
</div>

<style>
  .page-container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
    color: #1a1a1a;
  }

  .section-header p {
    margin: 4px 0 24px 0;
    color: #666;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }

  .stat-card {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    border: 1px solid #eee;
  }

  .label {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .value {
    font-size: 2rem;
    font-weight: 800;
    color: #c62828; /* Rojo a juego con el logo */
  }
</style>