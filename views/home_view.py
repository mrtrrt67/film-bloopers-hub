from datetime import datetime
import re
import streamlit as st

def render_home(get_config, is_visible, is_promo_active):
    # Recupera la data di scadenza impostata nella tab Promo Startup
    deadline_raw = get_config("promo_lifetime_deadline", "2026-12-31")
    try:
        dt_obj = datetime.strptime(deadline_raw, "%Y-%m-%d")
        deadline_formatted = dt_obj.strftime("%d/%m/%Y") # Formato italiano GG/MM/AAAA
    except:
        deadline_formatted = deadline_raw

    # Funzione per formattare i testi con la data dinamica
    def format_testo(testo):
        if not testo:
            return ""
        testo = testo.replace("{scadenza}", deadline_formatted).replace("{deadline}", deadline_formatted)
        testo = re.sub(r'\d{4}-\d{2}-\d{2}', deadline_formatted, testo)
        return testo

    # 1. Banner Superiore (Visibile solo se abilitato da admin E la promo è attiva)
    if is_visible("home_banner_top", True) and is_promo_active():
        banner_titolo = get_config("home_banner_top_titolo", "PROMO SPECIALE DI LANCIO STARTUP")
        banner_testo = format_testo(get_config("home_banner_top_testo", "Registrati o scala la classifica entro il {scadenza} per sbloccare subito l'accesso <b>Premium Lifetime gratuito</b> a vita!"))
        banner_badge = get_config("home_banner_top_badge", "Offerta a Tempo Limitato")
        
        st.markdown(f"""
            <div style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.14) 0%, rgba(15, 23, 42, 0.95) 100%); border: 1px solid rgba(234, 179, 8, 0.45); border-radius: 14px; padding: 18px 24px; margin-bottom: 20px; box-shadow: 0 8px 25px rgba(234, 179, 8, 0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-size: 32px;">🎁</span>
                    <div>
                        <div style="color: #facc15; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 2px;">{banner_titolo}</div>
                        <div style="color: #e5e7eb; font-size: 14px; line-height: 1.4;">{banner_testo}</div>
                    </div>
                </div>
                <div style="background: rgba(234, 179, 8, 0.22); color: #fef08a; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid rgba(234, 179, 8, 0.45); white-space: nowrap;">⭐ {banner_badge}</div>
            </div>
        """, unsafe_allow_html=True)

    col_sinistra, col_destra = st.columns([1, 2])
    
    with col_sinistra:
        # Sezione Stato Archivio
        if is_visible("home_visibile_archivio", True):
            testo_archivio = format_testo(get_config("home_archivio", "Inizia la scoperta: Vai su Esplora e Cerca nel menu a sinistra, inserisci un titolo o una saga e premi Invio per esplorare o generare nuovi contenuti."))
            st.markdown(f"""
                <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 24px; margin-right: 10px;">📂</span>
                        <h3 style="color: #f9fafc; margin: 0; font-size: 18px; font-weight: 700;">Stato Archivio</h3>
                    </div>
                    <div style="background: rgba(37, 99, 235, 0.12); border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 10px; padding: 14px; color: #93c5fd; font-size: 13px; line-height: 1.4;">
                        👉 {testo_archivio}
                    </div>
                </div>
            """, unsafe_allow_html=True)

    with col_destra:
        main_titolo = format_testo(get_config("home_main_titolo", "Errori, sviste e ciak falsi nella storia del cinema: dai classici che tutti conosciamo alle sorprese più inaspettate"))
        main_p1 = format_testo(get_config("home_main_p1", 'Quante volte, guardando un film, ti sei detto: <i>"Questo errore lo sapevo già!"</i> oppure <i>"Possibile che non ci avessi mai fatto caso prima?"</i>. Questo progetto nasce dalla passione per il cinema vissuto fotogramma per fotogramma, raccogliendo i piccoli e grandi scivoloni, i bloopers e le incongruenze che popolano la storia della settima arte.'))
        main_p2 = format_testo(get_config("home_main_p2", 'Dalle sviste storiche più clamorose agli errori di raccordo che fanno sorridere, ogni scheda è un viaggio dentro il set per riscoprire i tuoi film preferiti con occhi nuovi, unendo i titoli cult che tutti ricordiamo a scoperte del tutto inedite.'))

        st.markdown(f"""
            <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 28px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                <div style="display: flex; align-items: center; margin-bottom: 18px;">
                    <span style="font-size: 28px; margin-right: 12px;">🍿</span>
                    <h2 style="color: #f9fafc; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">{main_titolo}</h2>
                </div>
                <p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">{main_p1}</p>
                <p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">{main_p2}</p>
        """, unsafe_allow_html=True)

        # Box Promo Interna (Visibile solo se abilitato da admin E la promo è attiva)
        if is_visible("home_promo_interna", True) and is_promo_active():
            promo_int_testo = format_testo(get_config("home_promo_interna", "Approfitta della promozione di lancio: registrati ora per ottenere l'accesso Premium Lifetime gratuito."))
            promo_int_titolo = format_testo(get_config("home_promo_int_titolo", "Promo Startup attiva: Registrati gratis a vita!"))
            st.markdown(f"""
                <div style="background: rgba(234, 179, 8, 0.08); border: 1px solid rgba(234, 179, 8, 0.25); border-radius: 12px; padding: 16px; margin-bottom: 18px;">
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <h4 style="color: #facc15; margin: 0; font-size: 14px; font-weight: 600;">⭐ {promo_int_titolo}</h4>
                    </div>
                    <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">{promo_int_testo}</p>
                </div>
            """, unsafe_allow_html=True)

        # Box Inizia subito
        if is_visible("home_visibile_inizia_subito", True):
            testo_inizia = format_testo(get_config("home_inizia_subito", "Inizia subito: Usa il menu a sinistra per andare su Esplora e Cerca. Se il film non è ancora catalogato, la nostra intelligenza artificiale lo analizzerà in tempo reale per te!"))
            st.markdown(f"""
                <div style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 14px; padding: 14px;">
                    <p style="color: #86efac; font-size: 13px; margin: 0; line-height: 1.4;">👉 <b>Inizia subito:</b> {testo_inizia}</p>
                </div>
            """, unsafe_allow_html=True)

        st.markdown("</div>", unsafe_allow_html=True)