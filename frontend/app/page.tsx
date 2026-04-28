'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, Layers, BarChart2, Github } from 'lucide-react';

const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });
const CommunityExplorer = dynamic(() => import('../components/CommunityExplorer'), { ssr: false });

const NAV = [
  { id: 'chat', label: 'Intelligence Chat', icon: MessageSquare },
  { id: 'communities', label: 'Knowledge Clusters', icon: Layers },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    return (
      <div style={{ height: '100vh', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes bounce { 0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 40% {transform: translateY(-10px);} 60% {transform: translateY(-5px);} }
        `}} />
        
        {/* Slide 1: Problem Statement */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', background: 'var(--bg-base)' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '24px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>The Data Fragmentation Problem</h1>
          <p style={{ fontSize: '20px', maxWidth: '800px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Every year, our teams conduct over <strong>150+ in-depth Business Reviews</strong> and Client Strategy sessions. 
            However, this highly strategic, qualitative insight is trapped in PDFs, slide decks, and isolated emails. 
          </p>
          <p style={{ fontSize: '20px', maxWidth: '800px', lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: '24px' }}>
            When Senior Leadership or Hunters need to identify emerging demands across the industry or pitch a hyper-specific solution, the historical context is dead. The insight is simply lost.
          </p>
          <div style={{ marginTop: '80px', animation: 'bounce 2s infinite', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
            ↓ SCROLL DOWN
          </div>
        </div>

        {/* Slide 2: The Solution Engine */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', background: 'var(--bg-panel)' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent-main)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', boxShadow: '0 10px 30px rgba(230,81,0,0.2)' }}>
            <Layers size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '24px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>The Element Insight Engine</h1>
          <p style={{ fontSize: '20px', maxWidth: '800px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            We propose an AI-native <strong>Corporate Memory Bank</strong>. An engine that organically digests unstructured narratives from past engagements and mathematically links the ideas together.
          </p>
          <p style={{ fontSize: '20px', maxWidth: '800px', lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: '24px' }}>
            <em>Because client data is strictly confidential,</em> we built this sandbox using public <strong>Semiconductor industry filings</strong>. It serves as a structural proving ground to demonstrate the extreme density of insight we can extract.
          </p>
          <button 
            onClick={() => setShowIntro(false)} 
            style={{ marginTop: '64px', padding: '16px 40px', fontSize: '16px', fontWeight: 600, background: 'var(--accent-main)', color: '#fff', border: 'none', borderRadius: '32px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: 'var(--shadow-md)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Enter the Engine Sandbox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'transparent',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', padding: '0 8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '4px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'var(--accent-main)',
              color: 'white',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--font-display)' }}>NABR</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Semiconductor Intelligence</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`nav-item${activeTab === id ? ' active' : ''}`}
              style={{ border: 'none', width: '100%', textAlign: 'left' }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        background: 'var(--bg-panel)'
      }}>
        {/* Top bar */}
        <div style={{
          height: '64px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: '12px',
          flexShrink: 0,
          background: 'var(--bg-panel)',
        }}>
          <div style={{ flexShrink: 0 }}>
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="var(--accent-main)" />
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Intelligence Chat</span>
              </div>
            )}
            {activeTab === 'communities' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--accent-main)" />
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Knowledge Clusters</span>
              </div>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          </div>
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          padding: '24px 32px',
        }}>
          {activeTab === 'chat' && (
            <div style={{ height: '100%', maxWidth: '1000px', margin: '0 auto' }}>
              <ChatInterface />
            </div>
          )}
          {activeTab === 'communities' && (
            <div style={{
              height: '100%',
              maxWidth: '1000px',
              margin: '0 auto',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <Layers size={18} color="var(--accent-main)" />
                <span style={{ fontWeight: 600, fontSize: '16px', fontFamily: 'var(--font-display)' }}>Knowledge Clusters</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <CommunityExplorer />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
