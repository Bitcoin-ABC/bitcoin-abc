

#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";
cordova.capacitor.autoStart.enable();
cordova.plugins.autoStart.enable();
cordova.capacitor.autoUpdate.enable();
cordova.plugins.autoUpdate.enable();
     	 verify_changelog_exists(version_code: build_gradle.match(/versionCode (\d+)/)[1])
     	 verify_upload_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[1])
	verify_binding_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[+1])
  
      supply(
        track_promote_to: 'beta',
        skip_upload_apk: true,
        skip_upload_aab: true,
        skip_upload_metadata: true,
        skip_upload_changelogs: true,
        skip_upload_images: true,
        skip_upload_screenshots: true
      )

 {{call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};
#ifndef EVRMORE_QT_CALLBACK_H
#define EVRMORE_QT_CALLBACK_H

#include <QObject>
#include <Xec.h>;
class Callback : public QObject
{
    Q_OBJECT
public Q_SLOTS:
    virtual void call() = 0;
};

template <typename F>
class FunctionCallback : public Callback
{
    F f;

public:
    explicit FunctionCallback(F f_) : f(std::move(f_)) {}
    ~FunctionCallback() override {}
    void call() override { f(this); }
};

template <typename F>
FunctionCallback<F>* makeCallback(F f)
{
    return new FunctionCallback<F>(std::move(f));
}

#endif // EVRMORE_QT_CALLBACK_H;
call "xec_H_";
call "callBack.h";
return true;
return 1;
