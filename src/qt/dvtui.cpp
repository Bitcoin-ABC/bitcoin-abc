#include "dvtui.h"

qreal DVTUI::getDevicePixelRatio() {
    qreal devicePixelRatio = 1.0;
    devicePixelRatio = ((QGuiApplication*)QCoreApplication::instance())->devicePixelRatio();
    return devicePixelRatio;
}

QSize DVTUI::getToolbarIconSize() {
    QSize size = QSize(76,33);
    return size;
}

bool DVTUI::customThemeIsSet() {
    QSettings settings;
    return (settings.value("theme").toString() != "default");
}

    const QString DVTUI::s_LBlue = "rgb(46,144,255)"; // #00AEFF
    const QString DVTUI::s_green = "rgb(94,245,158)";
    const QString DVTUI::s_DVTBlue = "rgb(0,174,255)"; // #1B83EE

    const QString DVTUI::s_Darker = "rgb(22,22,22)"; // #161616
    const QString DVTUI::s_Dark = "rgb(50,50,50)"; // #323232
    const QString DVTUI::s_Light = "rgb(211,211,211)";
    const QString DVTUI::s_white = "rgb(255,255,255)";

    const QString DVTUI::s_hightlight_dark = "rgba(30,30,30)";
    const QString DVTUI::s_hightlight_darkest = "rgba(15,15,15)";

    const QString DVTUI::s_highlight_light_midgrey = "rgba(60,60,60)"; // #3C3C3C
    const QString DVTUI::s_highlight_dark_midgrey = "rgba(47,47,47)";
    const QString DVTUI::s_highlight_light_blue = "rgb(22,185,255)"; // #16B9FF
    const QString DVTUI::s_highlight_dark_blue = "rgb(2,90,155)"; // #025A9B

    const QString DVTUI::s_placeHolderText = "rgba(211,211,211,50%)";
    
    const QColor DVTUI::c_LBlue = QColor(46,144,255); 
    const QColor DVTUI::c_DVTBlue = QColor(0,174,255); 
    const QColor DVTUI::c_green = QColor(94,245,158);

    const QColor DVTUI::c_Darker = QColor(22,22,22);
    const QColor DVTUI::c_Dark = QColor(50,50,50);
    const QColor DVTUI::c_Light = QColor(211,211,211);
    const QColor DVTUI::c_white = QColor(255,255,255);

    const QColor DVTUI::c_hightlight_dark = QColor(30,30,30);

    const QColor DVTUI::c_highlight_light_midgrey = QColor(60,60,60);
    const QColor DVTUI::c_highlight_dark_midgrey = QColor(47,47,47);

    const QString DVTUI::styleSheetString = QString(
            //General
            "QFrame "
            "{ background-color: " + s_Darker + "; border: none; font-size: 14px;}"
            
            "QWidget "
            "{ background: " + s_Darker + "; color: " + s_Light + "; font-size: 14px;}"

            "#addressBookButton, #pasteButton, #deleteButton "
            "{ width: 35; height: 35; background-color: " + s_hightlight_dark + "; color: " + s_Light + "; border: 1px outset rgb(33,33,33); padding: 6px; border-radius: 0px;}"
           
            "#addressBookButton:hover, #pasteButton:hover, #deleteButton:hover "
            "{border: 1px solid "+ s_LBlue + "}"

            "#addressBookButton:pressed, #pasteButton:pressed, #deleteButton:pressed "
            "{background-color: " + s_Darker + "; border: 1px solid "+ s_LBlue + "}"

            "QLineEdit "
            "{ background: " + s_Darker + "; border-style: solid; border-color: " + s_LBlue + "; border-width: 1px; border-top: none; border-left: none; border-right: none;}"
            
            "#warningIcon "
            "{ border: none; background: transparent }"

            "#transactions_title "
            "{ color: qlineargradient(x0:0, y0:0, x1: 1, y1: 0, stop: 0 " + s_LBlue + ", stop: 0.3 " + s_green + "); font-size: 24px; }"
            
            "QPlainTextEdit "
            "{ background: " + s_hightlight_dark + "; border: 1px solid " + s_LBlue + "; border-left: none; border-right: none; border-top: none}"
            
            //Table view
            "QHeaderView "
            "{ background: " + s_Darker + ";} "
            
            "QTableView "
            "{ border: none; border-right: 1px solid " + s_Dark + "; selection-background-color: " + s_highlight_dark_midgrey + "; selection-color: "+ s_LBlue + "; alternate-background-color: " + s_hightlight_dark + ";}"
            
            "QTableView::item "
            "{ border-right: none; border-bottom: none; }"                    
            
            "#payAmount > QAbstractSpinBox, #payAmount > QComboBox"
            "{ min-height: 36px; font-size: 24px; color: " +  s_LBlue +"; font-weight: light;}"
            "#buy_adressInfo, #buy_amountInfo, #buy_amountVaryInfo "
            "{ color: " + s_placeHolderText + ";}"
            
            //Progress Bar
            "QProgressBar "
            "{ color: transparent; background: " + s_Darker + ";  border: 1px inset " + s_Dark + ";  padding: 0px; margin-left: 30px; margin-right: 30px;}" 
            "QProgressBar::chunk "
            "{ color: transparent; background: qlineargradient(x1:0, y1:0, x2: 0.5, y2: 0, x3: 1, y3: 0, stop: 0 rgba(94,204,158,100%), stop: 0.6 rgba(0,174,255,100%), stop: 0.9 rgba(46,144,255,100%)); border-radius: 1px; margin: 0px;}"
            
            //Balance seperator line
            "#lineb, #lineb1, #lineb2, #lineb3, #lineb4, #lineb5 , #lineb6 , #lineb7 , #lineb8 , #lineb9 ,#w_lineb, #w_lineb1, #w_lineb2, #w_lineb3, #w_lineb4, #w_lineb5, #w_lineb6, #w_lineb7, #w_lineb8, #w_lineb9"
            "{ border-top: none; border-left: none; border-right: none; border-bottom: 1px; border-style: solid; border-color: " + s_Dark + ";}"
            
            "#labelBalanceText, #labelPendingText, labelTotalText "
            "{ color: " + s_Light + ";}"
            
            //Checkbox & RadioButton
            "QCheckBox {spacing: 5px}"
            "QCheckBox::indicator { width: 14px; height: 14px } "
            "QCheckBox::indicator:unchecked { image: url(:icons/checkbox_empty) }"
            "QCheckBox::indicator:checked { image: url(:icons/checkbox_filled) }"
            "QCheckBox::indicator:unchecked:hover {image: url(:icons/checkbox_empty_hover)}"
            "QCheckBox::indicator:checked:hover {image: url(:icons/checkbox_filled_hover)}"


            "QRadioButton::indicator { width: 14px; height: 14px } "
            "QRadioButton::indicator:unchecked { image: url(:icons/radio_empty) }"
            "QRadioButton::indicator:checked { image: url(:icons/radio_filled) }"
            "QRadioButton::indicator:unchecked:hover { image: url(:icons/radio_empty_hover) }"
            "QRadioButton::indicator:checked:hover { image: url(:icons/radio_filled_hover) }"

            //Spinbox
            "QAbstractSpinBox { background: " + s_Darker + "; maximum-width: 500px; color: " +  s_LBlue +"; border-style: solid; border-width: 1px;  border-color: " + s_LBlue + "; border-top: none; border-left: none; border-right: none}"
            "QAbstractSpinBox::up-button {min-height: 7px; border: none; }"
            "QAbstractSpinBox::down-button { min-height: 7px; border: none}"
            "QAbstractSpinBox::up-button:off { min-height: 7px; border: none}"
            "QAbstractSpinBox::down-button:off {min-height: 7px; border: none}"
            "QAbstractSpinBox::up-arrow { image: url(:/icons/up_arrow) 1;}"
            "QAbstractSpinBox::down-arrow { image: url(:/icons/down_arrow) 1;}"                    
            "QAbstractSpinBox::up-arrow:off { image: url(:/icons/up_arrow_off) 1;}"                    
            "QAbstractSpinBox::down-arrow:off { image: url(:/icons/down_arrow_off) 1;}"

            //Combobox
            "QComboBox {color: " + s_placeHolderText + "; background: " + s_Darker + "; border-style: solid; border-width: 1px;  border-color: " + s_LBlue + "; border-top: none; border-left: none; border-right: none; min-width: 45px;}"
            "QComboBox QAbstractItemView { border: 1px outset " + s_Dark + "; background-color: " + s_hightlight_darkest + "}"//border-style: outset; border-width: 1px;  border-color: " + s_Dark + "; }"
            "QComboBox::drop-down { border: none; }"

            "QComboBox::down-arrow { image: url(:/icons/down_arrow) 1; width: 24; height: 24; border: none;}"

            //Menu
            "QMenu:item:selected { background: " + s_Dark + ";}"
            "QMenuBar { background-color: " + s_Darker + "; border: solid 1px " + s_Dark + ";}"
            "QMenuBar:item { padding: 5px; spacing: 0px;}"
            "QMenuBar:item:selected { background: " + s_Dark + ";}"

            //Toolbar
            "#toolbar {background: " + s_Darker + "; border-left: none; border-right: 1px solid " + s_Dark + "; border-top: none; border-bottom: none; padding-top: 0px;}"
            "#toolbar > QToolButton { width: 150px; height: 40px; background: transparent; border: none; padding: 6px; padding-left: 1px; padding-right: 1px; margin-bottom: 1px;}"
            "#toolbar > QToolButton:hover { color: " + s_LBlue + "; border: none}"                    
            "#toolbar > QToolButton:checked { color: " + s_LBlue + "; border: none;}"
            
            //Scrollbar
            "QScrollBar:vertical {background: " + s_Darker + "; padding-top: 13px; padding-bottom: 13px;}"
            "QScrollBar:horizontal {background: " + s_Darker + "; padding-left: 13px; padding-right: 13px;}"
            "QScrollBar::handle { background: " + s_Dark + "; border: 1px outset " + s_Dark + "}"
            "QScrollBar::handle:vertical {min-height: 20px}"
            "QScrollBar::handle:horizontal {min-width: 20px}"
            "QScrollBar::handle:hover { background: " + s_highlight_light_midgrey + "; border: 1px outset " + s_highlight_light_midgrey + "}"
            "QScrollBar::handle:pressed { background: " + s_highlight_dark_midgrey + "; border: 1px outset " + s_Dark + "}"
            "QScrollBar::add-line:vertical { background: " + s_Darker + "; height: 10px; border: 1px outset " + s_Dark + "; subcontrol-positon: bottom; subcontrol-origin: margin; }"
            "QScrollBar::sub-line:vertical { background: " + s_Darker + "; height: 10px; border: 1px outset " + s_Dark + "; subcontrol-positon: top; subcontrol-origin: margin;}"
            "QScrollBar::up-arrow:vertical { image: url(:/icons/up_arrow) 1; }"
            "QScrollBar::down-arrow:vertical { image: url(:/icons/down_arrow) 1; }"
            "QScrollBar::add-line:horizontal { background: " + s_Darker + "; width: 10px; border: 1px outset " + s_Dark + "; subcontrol-positon: right; subcontrol-origin: margin;}"
            "QScrollBar::sub-line:horizontal { background: " + s_Darker + "; width: 10px; border: 1px outset " + s_Dark + "; subcontrol-position: left; subcontrol-origin: margin;}"
            "QScrollBar::left-arrow:horizontal { image: url(:/icons/left_arrow) 1; }"
            "QScrollBar::right-arrow:horizontal { image: url(:/icons/right_arrow) 1; }"                     

            //Buttons (and Icons)
            "QPushButton "
            "{ background-color: " + s_hightlight_dark + "; color: " + s_Light + "; border: 1px outset rgb(33,33,33); padding: 6px; border-radius: 0px;}"
            "QPushButton:hover {border: 1px solid "+ s_LBlue + "}"
            "QPushButton:pressed {background-color: " + s_Darker + "; border: 1px solid "+ s_LBlue + "}"
            "QPushButton:disabled { color: " + s_Dark + "}"

            "#payTo, #reqLabel, #reqMessage, #reqAmount, #addAsLabel, #label_Label, #label_amount, #label_message "
            "{ font-size: 14px; font-weight: thin; color: " + s_Light + ";}"                   
            

            //Disturbing borders
            "#labelWalletStatus { border: none; background: transparent}"
            "#labelTransactionsStatus { border: none; background: transparent}"
            "#lineWatchBalance { border: none;}"
            "#widgetCoinControl { border: none }"
            "#frameFeeSelection { border: none}"

            //Optional Borders
            "#frame { border: none;}"                               //balances frame
            "#frame_2 {border: none;}"                              //recent transactions
            "#SendCoins {border: none;}"                            //sendcoins entries
            //"#SendCoinsDialog > #scrollArea {border: 1px solid " + s_Dark + ";}"  //sendcoins scrollarea
            "#frameFee {border: none;}"                             //sendcoins lower frame
            "#frame2 {border: none;}"                               //receive coins
            "#scrollArea {border: none; }"

            "QToolTip { background: " + s_Dark + "; color: "+  s_Light + "; border: none }"

        );
