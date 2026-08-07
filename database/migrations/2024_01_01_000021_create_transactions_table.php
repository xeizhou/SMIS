<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id('transactionID');
            $table->string('transaction_type', 15);

            $table->string('stock_no', 50)->nullable();
            $table->foreign('stock_no', 'fk_transactions_stock_no')
                ->references('stock_no')->on('stock_items')
                ->restrictOnDelete();

            $table->string('fund_cluster', 20);

            $table->dateTime('transaction_date');
            $table->string('item_name', 150);

            $table->foreignId('unitID')
                ->constrained('units', 'unitID')
                ->restrictOnDelete();

            $table->string('reference', 50);
            $table->integer('quantity');

            $table->string('office_code', 20);

            $table->foreign('fund_cluster', 'fk_transactions_fund_cluster')
                ->references('fund_cluster_id')->on('fund_clusters')
                ->restrictOnDelete();

            $table->foreign('office_code', 'fk_transactions_office_code')
                ->references('office_code')->on('offices')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};