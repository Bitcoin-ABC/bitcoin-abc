// Copyright (c) 2011-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "bitcoinamountfield.h"

#include "bitcoinunits.h"
#include "guiconstants.h"
#include "qvaluecombobox.h"

#include <QAbstractSpinBox>
#include <QApplication>
#include <QHBoxLayout>
#include <QKeyEvent>
#include <QLineEdit>

/**
 * QSpinBox that uses fixed-point numbers internally and uses our own
 * formatting/parsing functions.
 */
class AmountSpinBox : public QAbstractSpinBox {
    Q_OBJECT

public:
    explicit AmountSpinBox(QWidget *parent)
        : QAbstractSpinBox(parent), currentUnit(BitcoinUnits::BCH),
          singleStep(100000 * SATOSHI) {
        setAlignment(Qt::AlignRight);

        connect(lineEdit(), SIGNAL(textEdited(QString)), this,
                SIGNAL(valueChanged()));
    }

    QValidator::State validate(QString &text, int &pos) const override {
        if (text.isEmpty()) {
            return QValidator::Intermediate;
        }
        bool valid = false;
        parse(text, &valid);
        // Make sure we return Intermediate so that fixup() is called on
        // defocus.
        return valid ? QValidator::Intermediate : QValidator::Invalid;
    }

    void fixup(QString &input) const override {
        bool valid = false;
        Amount val = parse(input, &valid);
        if (valid) {
            input = BitcoinUnits::format(currentUnit, val, false,
                                         BitcoinUnits::separatorAlways);
            lineEdit()->setText(input);
        }
    }

    Amount value(bool *valid_out = 0) const { return parse(text(), valid_out); }

    void setValue(const Amount value) {
        lineEdit()->setText(BitcoinUnits::format(
            currentUnit, value, false, BitcoinUnits::separatorAlways));
        Q_EMIT valueChanged();
    }

    void stepBy(int steps) override {
        bool valid = false;
        Amount val = value(&valid);
        val = val + steps * singleStep;
        val = qMin(qMax(val, Amount::zero()), BitcoinUnits::maxMoney());
        setValue(val);
    }

    void setDisplayUnit(int unit) {
        bool valid = false;
        Amount val(value(&valid));
        currentUnit = unit;

        if (valid) {
            setValue(val);
        } else {
            clear();
        }
    }

    void setSingleStep(const Amount step) { singleStep = step; }

    QSize minimumSizeHint() const override {
        if (cachedMinimumSizeHint.isEmpty()) {
            ensurePolished();

            const QFontMetrics fm(fontMetrics());
            int h = lineEdit()->minimumSizeHint().height();
            int w = fm.width(BitcoinUnits::format(
                BitcoinUnits::BCH, BitcoinUnits::maxMoney(), false,
                BitcoinUnits::separatorAlways));
            // Cursor blinking space.
            w += 2;

            QStyleOptionSpinBox opt;
            initStyleOption(&opt);
            QSize hint(w, h);
            QSize extra(35, 6);
            opt.rect.setSize(hint + extra);
            extra +=
                hint - style()
                           ->subControlRect(QStyle::CC_SpinBox, &opt,
                                            QStyle::SC_SpinBoxEditField, this)
                           .size();
            // Get closer to final result by repeating the calculation.
            opt.rect.setSize(hint + extra);
            extra +=
                hint - style()
                           ->subControlRect(QStyle::CC_SpinBox, &opt,
                                            QStyle::SC_SpinBoxEditField, this)
                           .size();
            hint += extra;
            hint.setHeight(h);

            opt.rect = rect();

            cachedMinimumSizeHint =
                style()
                    ->sizeFromContents(QStyle::CT_SpinBox, &opt, hint, this)
                    .expandedTo(QApplication::globalStrut());
        }
        return cachedMinimumSizeHint;
    }

private:
    int currentUnit;
    Amount singleStep;
    mutable QSize cachedMinimumSizeHint;

    /**
     * Parse a string into a number of base monetary units and
     * return validity.
     * @note Must return 0 if !valid.
     */
    Amount parse(const QString &text, bool *valid_out = 0) const {
        Amount val = Amount::zero();
        bool valid = BitcoinUnits::parse(currentUnit, text, &val);
        if (valid) {
            if (val < Amount::zero() || val > BitcoinUnits::maxMoney()) {
                valid = false;
            }
        }
        if (valid_out) {
            *valid_out = valid;
        }
        return valid ? val : Amount::zero();
    }

protected:
    bool event(QEvent *event) override {
        if (event->type() == QEvent::KeyPress ||
            event->type() == QEvent::KeyRelease) {
            QKeyEvent *keyEvent = static_cast<QKeyEvent *>(event);
            if (keyEvent->key() == Qt::Key_Comma) {
                // Translate a comma into a period.
                QKeyEvent periodKeyEvent(
                    event->type(), Qt::Key_Period, keyEvent->modifiers(), ".",
                    keyEvent->isAutoRepeat(), keyEvent->count());
                return QAbstractSpinBox::event(&periodKeyEvent);
            }
        }
        return QAbstractSpinBox::event(event);
    }

    StepEnabled stepEnabled() const override {
        if (isReadOnly()) {
            // Disable steps when AmountSpinBox is read-only.
            return StepNone;
        }
        if (text().isEmpty()) {
            // Allow step-up with empty field.
            return StepUpEnabled;
        }

        StepEnabled rv = 0;
        bool valid = false;
        Amount val = value(&valid);
        if (valid) {
            if (val > Amount::zero()) {
                rv |= StepDownEnabled;
            }
            if (val < BitcoinUnits::maxMoney()) {
                rv |= StepUpEnabled;
            }
        }
        return rv;
    }

Q_SIGNALS:
    void valueChanged();
};

#include "bitcoinamountfield.moc"

BitcoinAmountField::BitcoinAmountField(QWidget *parent)
    : QWidget(parent), amount(0) {
    amount = new AmountSpinBox(this);
    amount->setLocale(QLocale::c());
    amount->installEventFilter(this);
    amount->setMaximumWidth(170);

    QHBoxLayout *layout = new QHBoxLayout(this);
    layout->addWidget(amount);
    unit = new QValueComboBox(this);
    unit->setModel(new BitcoinUnits(this));
    layout->addWidget(unit);
    layout->addStretch(1);
    layout->setContentsMargins(0, 0, 0, 0);

    setLayout(layout);

    setFocusPolicy(Qt::TabFocus);
    setFocusProxy(amount);

    // If one if the widgets changes, the combined content changes as well
    connect(amount, SIGNAL(valueChanged()), this, SIGNAL(valueChanged()));
    connect(unit, SIGNAL(currentIndexChanged(int)), this,
            SLOT(unitChanged(int)));

    // Set default based on configuration
    unitChanged(unit->currentIndex());
}

void BitcoinAmountField::clear() {
    amount->clear();
    unit->setCurrentIndex(0);
}

void BitcoinAmountField::setEnabled(bool fEnabled) {
    amount->setEnabled(fEnabled);
    unit->setEnabled(fEnabled);
}

bool BitcoinAmountField::validate() {
    bool valid = false;
    value(&valid);
    setValid(valid);
    return valid;
}

void BitcoinAmountField::setValid(bool valid) {
    if (valid) {
        amount->setStyleSheet("");
    } else {
        amount->setStyleSheet(STYLE_INVALID);
    }
}

bool BitcoinAmountField::eventFilter(QObject *object, QEvent *event) {
    if (event->type() == QEvent::FocusIn) {
        // Clear invalid flag on focus
        setValid(true);
    }
    return QWidget::eventFilter(object, event);
}

QWidget *BitcoinAmountField::setupTabChain(QWidget *prev) {
    QWidget::setTabOrder(prev, amount);
    QWidget::setTabOrder(amount, unit);
    return unit;
}

Amount BitcoinAmountField::value(bool *valid_out) const {
    return amount->value(valid_out);
}

void BitcoinAmountField::setValue(const Amount value) {
    amount->setValue(value);
}

void BitcoinAmountField::setReadOnly(bool fReadOnly) {
    amount->setReadOnly(fReadOnly);
}

void BitcoinAmountField::unitChanged(int idx) {
    // Use description tooltip for current unit for the combobox
    unit->setToolTip(unit->itemData(idx, Qt::ToolTipRole).toString());

    // Determine new unit ID
    int newUnit = unit->itemData(idx, BitcoinUnits::UnitRole).toInt();

    amount->setDisplayUnit(newUnit);
}

void BitcoinAmountField::setDisplayUnit(int newUnit) {
    unit->setValue(newUnit);
}

void BitcoinAmountField::setSingleStep(const Amount step) {
    amount->setSingleStep(step);
}
