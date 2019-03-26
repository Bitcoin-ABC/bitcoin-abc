#ifndef DVT_UI_H

#define DVT_UI_H

#include <QApplication>
#include <QColor>
#include <QFont>
#include <QFontDatabase>
#include <QSettings>


class DVTUI
{
    static qreal getDevicePixelRatio();

    
    public:

    static QSize getToolbarIconSize(); 

    static bool customThemeIsSet();

    static const QString s_LBlue; // #00AEFF
    static const QString s_green;
    static const QString s_DVTBlue; // #1B83EE

    static const QString s_Darker; // #161616
    static const QString s_Dark; // #323232
    static const QString s_Light;
    static const QString s_white;

    static const QString s_hightlight_dark;
    static const QString s_hightlight_darkest;

    static const QString s_highlight_light_midgrey; // #3C3C3C
    static const QString s_highlight_dark_midgrey;
    static const QString s_highlight_light_blue; // #16B9FF
    static const QString s_highlight_dark_blue; // #025A9B

    static const QString s_placeHolderText;
    
    static const QColor c_LBlue; 
    static const QColor c_DVTBlue; 
    static const QColor c_green;

    static const QColor c_Darker;
    static const QColor c_Dark;
    static const QColor c_Light;
    static const QColor c_white;

    static const QColor c_hightlight_dark;

    static const QColor c_highlight_light_midgrey;
    static const QColor c_highlight_dark_midgrey;

    static const QString styleSheetString;
};

#endif // DVT_UI_H
