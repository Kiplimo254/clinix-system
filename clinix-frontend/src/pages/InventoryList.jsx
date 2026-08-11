import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { inventoryApi } from '../api/client';

export default function InventoryList() {
  const { isAdmin, isNurse, isReceptionist } = useAuth();
  const [items, setItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals / forms
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', unit: '', quantity_on_hand: 0, reorder_level: 10, unit_cost: '', expiry_date: '' });
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, lowStockRes] = await Promise.all([
        inventoryApi.list(),
        inventoryApi.lowStock()
      ]);
      setItems(itemsRes.data.results || itemsRes.data);
      setLowStockItems(lowStockRes.data.results || lowStockRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const payload = { ...form };
      if (!payload.expiry_date) delete payload.expiry_date;
      await inventoryApi.create(payload);
      setShowAdd(false);
      setForm({ name: '', unit: '', quantity_on_hand: 0, reorder_level: 10, unit_cost: '', expiry_date: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to add item.');
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!restockItem) return;
    try {
      await inventoryApi.restock(restockItem.id, restockQty);
      setRestockItem(null);
      setRestockQty('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to restock item.');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2>Inventory</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : 'Add New Item'}
          </button>
        )}
      </div>

      {lowStockItems.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          <strong>Low Stock Alert:</strong> {lowStockItems.length} item(s) are below reorder level.
        </div>
      )}

      {items.filter(i => {
        if (!i.expiry_date) return false;
        const exp = new Date(i.expiry_date);
        const nextMonth = new Date();
        nextMonth.setDate(new Date().getDate() + 30);
        return exp <= nextMonth;
      }).length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <strong>Expiry Alert:</strong> Some items are expired or expiring within 30 days!
        </div>
      )}

      {showAdd && isAdmin && (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card-header"><span className="card-title">Add New Inventory Item</span></div>
          <form onSubmit={handleAddItem} className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Item Name</label>
              <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Unit (e.g. tablets, ml, boxes)</label>
              <input type="text" className="form-control" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Initial Quantity</label>
              <input type="number" className="form-control" value={form.quantity_on_hand} onChange={e => setForm({...form, quantity_on_hand: parseInt(e.target.value)})} required min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Level</label>
              <input type="number" className="form-control" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: parseInt(e.target.value)})} required min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date (Optional)</label>
              <input type="date" className="form-control" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary">Save Item</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p>Loading inventory...</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Unit</th>
                  <th>Quantity on Hand</th>
                  <th>Reorder Level</th>
                  <th>Expiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>No inventory items found.</td></tr>
                ) : items.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.unit}</td>
                    <td>
                      <span className={item.quantity_on_hand <= item.reorder_level ? 'text-danger fw-bold' : ''}>
                        {item.quantity_on_hand}
                      </span>
                    </td>
                    <td>{item.reorder_level}</td>
                    <td>
                      {item.expiry_date ? (
                        <span style={{ 
                          color: new Date(item.expiry_date) <= new Date(new Date().setDate(new Date().getDate() + 30)) ? 'var(--clr-error)' : 'inherit'
                        }}>
                          {item.expiry_date}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {(isAdmin || isNurse) && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => setRestockItem(item)}
                        >
                          Restock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {restockItem && (
        <div className="modal-backdrop fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
            <div className="card-header"><span className="card-title">Restock: {restockItem.name}</span></div>
            <form onSubmit={handleRestock}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Quantity to Add ({restockItem.unit})</label>
                <input type="number" className="form-control" value={restockQty} onChange={e => setRestockQty(e.target.value)} min="1" required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setRestockItem(null); setRestockQty(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
