<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_items', function (Blueprint $table) {
            $table->string('stock_no', 50)->primary();
            $table->string('item_name', 100);
            $table->string('description', 255)->nullable();

            $table->foreignId('unitID')->nullable()
                ->constrained('units', 'unitID')
                ->nullOnDelete();

            $table->integer('on_hand_quantity')->default(0);
            $table->integer('re_order_point')->default(0);

            $table->string('fund_cluster_id', 20)->nullable();
            $table->string('link', 500)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('fund_cluster_id', 'fk_stockitems_fund_cluster')
                ->references('fund_cluster_id')->on('fund_clusters')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_items');
    }
};
