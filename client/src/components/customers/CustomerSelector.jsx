import React, { useState, useEffect } from 'react';
import { Search, UserCheck, X, Phone, MapPin } from 'lucide-react';
import { customersApi } from '../../api/customersApi';

export const CustomerSelector = ({ selectedCustomer, onSelectCustomer, onClearCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await customersApi.getCustomers({ search: searchTerm, limit: 8 });
        setCustomers(res.data || []);
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (selectedCustomer) {
    return (
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #fdf9ee 0%, #ffffff 100%)',
          border: '1.5px solid var(--accent-gold)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
            }}
          >
            {selectedCustomer.name?.charAt(0) || 'C'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {selectedCustomer.name}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  borderRadius: '12px',
                  fontWeight: 600,
                }}
              >
                Selected Customer
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={14} /> {selectedCustomer.mobileNumber}
              </span>
              {selectedCustomer.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> {selectedCustomer.address}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearCustomer}
          className="btn btn-outline btn-sm"
          style={{ borderColor: '#cbd5e1', color: '#475569' }}
        >
          <X size={14} /> Change Customer
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search customer by Name or Mobile number..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{ paddingLeft: '40px', paddingRight: '40px' }}
        />
        <Search
          size={18}
          color="#94a3b8"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCustomers([]);
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && searchTerm.trim() && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 100,
          }}
        >
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Searching...
            </div>
          ) : customers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div>No customer found</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Please choose the "New Customer" option.
              </div>
            </div>
          ) : (
            customers.map((c) => (
              <div
                key={c._id}
                onClick={() => {
                  onSelectCustomer(c);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                    <span>Phone: {c.mobileNumber}</span>
                    {c.address && <span>Address: {c.address}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <UserCheck size={16} /> Select
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
