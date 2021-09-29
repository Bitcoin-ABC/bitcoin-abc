# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-qt-locale)

include(BrewHelper)
find_brew_prefix(QT5_PREFIX qt5)

find_package(Qt5LinguistTools HINTS "${QT5_PREFIX}")

if(Qt5LinguistTools_VERSION VERSION_GREATER_EQUAL 5.11)
	set(QT5_ADD_TRANSLATION_OPTIONS OPTIONS -silent)
endif()

qt5_add_translation(BITCOIN_QM_FILES
	bitcoin_af.ts
	bitcoin_af_ZA.ts
	bitcoin_ar.ts
	bitcoin_be_BY.ts
	bitcoin_bg_BG.ts
	bitcoin_bg.ts
	bitcoin_ca_ES.ts
	bitcoin_ca.ts
	bitcoin_ca@valencia.ts
	bitcoin_cs.ts
	bitcoin_cy.ts
	bitcoin_da.ts
	bitcoin_de.ts
	bitcoin_el_GR.ts
	bitcoin_el.ts
	bitcoin_en_GB.ts
	bitcoin_en.ts
	bitcoin_eo.ts
	bitcoin_es_AR.ts
	bitcoin_es_CL.ts
	bitcoin_es_CO.ts
	bitcoin_es_DO.ts
	bitcoin_es_ES.ts
	bitcoin_es_MX.ts
	bitcoin_es.ts
	bitcoin_es_UY.ts
	bitcoin_es_VE.ts
	bitcoin_et_EE.ts
	bitcoin_et.ts
	bitcoin_eu_ES.ts
	bitcoin_fa_IR.ts
	bitcoin_fa.ts
	bitcoin_fi.ts
	bitcoin_fr_CA.ts
	bitcoin_fr_FR.ts
	bitcoin_fr.ts
	bitcoin_gl.ts
	bitcoin_he.ts
	bitcoin_hi_IN.ts
	bitcoin_hr.ts
	bitcoin_hu.ts
	bitcoin_id_ID.ts
	bitcoin_it_IT.ts
	bitcoin_it.ts
	bitcoin_ja.ts
	bitcoin_ka.ts
	bitcoin_kk_KZ.ts
	bitcoin_ko_KR.ts
	bitcoin_ku_IQ.ts
	bitcoin_ky.ts
	bitcoin_la.ts
	bitcoin_lt.ts
	bitcoin_lv_LV.ts
	bitcoin_mk_MK.ts
	bitcoin_mn.ts
	bitcoin_ms_MY.ts
	bitcoin_nb.ts
	bitcoin_ne.ts
	bitcoin_nl.ts
	bitcoin_pam.ts
	bitcoin_pl.ts
	bitcoin_pt_BR.ts
	bitcoin_pt_PT.ts
	bitcoin_ro_RO.ts
	bitcoin_ro.ts
	bitcoin_ru_RU.ts
	bitcoin_ru.ts
	bitcoin_sk.ts
	bitcoin_sl_SI.ts
	bitcoin_sq.ts
	bitcoin_sr@latin.ts
	bitcoin_sr.ts
	bitcoin_sv.ts
	bitcoin_ta.ts
	bitcoin_th_TH.ts
	bitcoin_tr_TR.ts
	bitcoin_tr.ts
	bitcoin_uk.ts
	bitcoin_ur_PK.ts
	bitcoin_uz@Cyrl.ts
	bitcoin_vi.ts
	bitcoin_vi_VN.ts
	bitcoin_zh_CN.ts
	bitcoin_zh_HK.ts
	bitcoin_zh.ts
	bitcoin_zh_TW.ts
	${QT5_ADD_TRANSLATION_OPTIONS}
)

add_custom_target(locales DEPENDS ${BITCOIN_QM_FILES})
