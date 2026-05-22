package com.cashtab.app.recaptcha;

import android.app.Application;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.recaptcha.Recaptcha;
import com.google.android.recaptcha.RecaptchaAction;
import com.google.android.recaptcha.RecaptchaTasksClient;

@CapacitorPlugin(name = "CashtabRecaptcha")
public class CashtabRecaptchaPlugin extends Plugin {

    private RecaptchaTasksClient recaptchaTasksClient;
    private String initializedSiteKey;

    @PluginMethod
    public void execute(PluginCall call) {
        String action = call.getString("action");
        String siteKey = call.getString("siteKey");

        if (action == null || action.isEmpty()) {
            call.reject("action is required");
            return;
        }
        if (siteKey == null || siteKey.isEmpty()) {
            call.reject("siteKey is required");
            return;
        }

        if (recaptchaTasksClient != null && siteKey.equals(initializedSiteKey)) {
            executeAction(call, action);
            return;
        }

        Application app = (Application) getContext().getApplicationContext();
        Recaptcha.fetchTaskClient(app, siteKey)
            .addOnSuccessListener(
                client -> {
                    recaptchaTasksClient = client;
                    initializedSiteKey = siteKey;
                    executeAction(call, action);
                })
            .addOnFailureListener(
                e -> call.reject("Failed to initialize reCAPTCHA client", e));
    }

    private void executeAction(PluginCall call, String action) {
        recaptchaTasksClient
            .executeTask(RecaptchaAction.custom(action))
            .addOnSuccessListener(
                token -> {
                    JSObject ret = new JSObject();
                    ret.put("token", token);
                    call.resolve(ret);
                })
            .addOnFailureListener(e -> call.reject("reCAPTCHA execute failed", e));
    }
}
