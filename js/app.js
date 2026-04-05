document.addEventListener('DOMContentLoaded', function () {
    const inputs = document.querySelectorAll('.amount-input');
    const labelInputs = document.querySelectorAll('.label-input');
    const sectionHeaders = document.querySelectorAll('.section-header');

    // Store default label names for edit detection
    var defaultLabels = [];
    labelInputs.forEach(function (label) {
        defaultLabels.push(label.value);
    });

    // Format currency
    function formatCurrency(amount) {
        return 'R ' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Get sum of inputs by category
    function sumByCategory(category) {
        let total = 0;
        document.querySelectorAll(`.amount-input[data-category="${category}"]`).forEach(function (input) {
            total += parseFloat(input.value) || 0;
        });
        return total;
    }

    // Recalculate all totals
    function recalculate() {
        var income = sumByCategory('income');
        var expenses = sumByCategory('expenses');
        var savings = sumByCategory('savings');
        var planning = sumByCategory('planning');
        var pocket = sumByCategory('pocket');
        var debt = sumByCategory('debt');

        var totalOutflows = expenses + savings + planning + pocket + debt;
        var disposable = income - totalOutflows;

        // Update section totals
        document.getElementById('totalIncome').textContent = formatCurrency(income);
        document.getElementById('totalExpenses').textContent = formatCurrency(expenses);
        document.getElementById('totalSavings').textContent = formatCurrency(savings);
        document.getElementById('totalPlanning').textContent = formatCurrency(planning);
        document.getElementById('totalPocket').textContent = formatCurrency(pocket);
        document.getElementById('totalDebt').textContent = formatCurrency(debt);
        document.getElementById('totalDisposable').textContent = formatCurrency(disposable);

        // Update summary bar
        document.getElementById('summaryIncome').textContent = formatCurrency(income);
        document.getElementById('summaryExpenses').textContent = formatCurrency(totalOutflows);
        document.getElementById('summaryDisposable').textContent = formatCurrency(disposable);

        // Color disposable income
        var disposableEl = document.getElementById('totalDisposable');
        var summaryDisposableEl = document.getElementById('summaryDisposable');
        var disposableCard = summaryDisposableEl.closest('.summary-card');

        if (disposable >= 0) {
            disposableEl.classList.add('disposable-positive');
            disposableEl.classList.remove('disposable-negative');
            disposableCard.style.background = '#e8f5e9';
            disposableCard.style.color = '#2e7d32';
        } else {
            disposableEl.classList.add('disposable-negative');
            disposableEl.classList.remove('disposable-positive');
            disposableCard.style.background = '#ffebee';
            disposableCard.style.color = '#c62828';
        }

        // Save to localStorage
        saveData();
    }

    // Highlight inputs with values
    function updateInputStyle(input) {
        if (input.value && parseFloat(input.value) !== 0) {
            input.classList.add('has-value');
        } else {
            input.classList.remove('has-value');
        }
    }

    // Attach input listeners
    inputs.forEach(function (input) {
        input.addEventListener('input', function () {
            updateInputStyle(this);
            recalculate();
        });
    });

    // Attach label edit listeners
    labelInputs.forEach(function (label, index) {
        label.addEventListener('input', function () {
            if (this.value !== defaultLabels[index]) {
                this.classList.add('label-edited');
            } else {
                this.classList.remove('label-edited');
            }
            saveData();
        });
    });

    // Toggle sections
    sectionHeaders.forEach(function (header) {
        header.addEventListener('click', function () {
            var body = this.nextElementSibling;
            if (body && body.classList.contains('section-body')) {
                body.classList.toggle('collapsed');
            }
        });
    });

    // Save data to localStorage
    function saveData() {
        var data = {};
        var month = document.getElementById('budgetMonth').value;
        data.month = month;
        data.values = [];
        data.labels = [];
        inputs.forEach(function (input, index) {
            data.values.push(input.value);
        });
        labelInputs.forEach(function (label) {
            data.labels.push(label.value);
        });
        localStorage.setItem('budgetApp_' + month, JSON.stringify(data));
        localStorage.setItem('budgetApp_lastMonth', month);
    }

    // Load data from localStorage
    function loadData(month) {
        var stored = localStorage.getItem('budgetApp_' + month);
        if (stored) {
            var data = JSON.parse(stored);
            inputs.forEach(function (input, index) {
                if (data.values[index]) {
                    input.value = data.values[index];
                    updateInputStyle(input);
                }
            });
            if (data.labels) {
                labelInputs.forEach(function (label, index) {
                    if (data.labels[index]) {
                        label.value = data.labels[index];
                        if (label.value !== defaultLabels[index]) {
                            label.classList.add('label-edited');
                        } else {
                            label.classList.remove('label-edited');
                        }
                    }
                });
            }
        }
        recalculate();
    }

    // Month change handler
    document.getElementById('budgetMonth').addEventListener('change', function () {
        // Clear current values
        inputs.forEach(function (input) {
            input.value = '';
            input.classList.remove('has-value');
        });
        // Reset labels to defaults
        labelInputs.forEach(function (label, index) {
            label.value = defaultLabels[index];
            label.classList.remove('label-edited');
        });
        loadData(this.value);
    });

    // Clear all
    document.getElementById('btnClear').addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all values and reset item names?')) {
            inputs.forEach(function (input) {
                input.value = '';
                input.classList.remove('has-value');
            });
            labelInputs.forEach(function (label, index) {
                label.value = defaultLabels[index];
                label.classList.remove('label-edited');
            });
            recalculate();
        }
    });

    // Export CSV
    document.getElementById('btnExport').addEventListener('click', function () {
        var month = document.getElementById('budgetMonth').value;
        var rows = [['Category', 'Item', 'Amount (R)']];

        document.querySelectorAll('.budget-section').forEach(function (section) {
            var sectionName = section.querySelector('.section-header h2').textContent;
            var sectionInputs = section.querySelectorAll('.amount-input');

            if (sectionInputs.length === 0) {
                // Disposable income section
                var total = section.querySelector('.section-total').textContent;
                rows.push([sectionName, '', total.replace('R ', '')]);
                return;
            }

            sectionInputs.forEach(function (input) {
                var lineItem = input.closest('.line-item');
                var label = lineItem.querySelector('.label-input').value;
                var value = parseFloat(input.value) || 0;
                rows.push([sectionName, label, value.toFixed(2)]);
            });
        });

        var csvContent = rows.map(function (row) {
            return row.map(function (cell) {
                return '"' + cell + '"';
            }).join(',');
        }).join('\n');

        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'budget_' + month + '.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    });

    // Print
    document.getElementById('btnPrint').addEventListener('click', function () {
        window.print();
    });

    // Load last used month or default
    var lastMonth = localStorage.getItem('budgetApp_lastMonth');
    if (lastMonth) {
        document.getElementById('budgetMonth').value = lastMonth;
        loadData(lastMonth);
    } else {
        loadData('2016-01');
    }
});
