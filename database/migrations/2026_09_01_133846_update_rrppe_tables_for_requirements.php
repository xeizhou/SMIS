<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create the new items table
        Schema::create('rrppe_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rrppe_monitoring_id');
            $table->string('item_name')->nullable();
            $table->text('item_description')->nullable();
            $table->integer('quantity')->nullable();
            $table->string('property_no', 50)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('status', 50)->nullable();
            $table->string('area', 100)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('rrppe_monitoring_id')
                  ->references('id')
                  ->on('rrppe_monitoring')
                  ->onDelete('cascade');
        });

        // 2. Modify the main monitoring table
        Schema::table('rrppe_monitoring', function (Blueprint $table) {
            // Drop unique constraint that relies on property_no
            $table->dropUnique('uq_rrppe_pk');

            // Drop columns moved to items
            $table->dropColumn([
                'item_description',
                'quantity',
                'property_no',
                'cost',
                'status',
                'area',
                'remarks'
            ]);

            // Add return_by
            $table->string('return_by')->nullable()->after('end_user_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rrppe_monitoring', function (Blueprint $table) {
            $table->dropColumn('return_by');
            
            $table->text('item_description')->nullable();
            $table->integer('quantity')->nullable();
            $table->string('property_no', 50)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('status', 50)->nullable();
            $table->string('area', 100)->nullable();
            $table->text('remarks')->nullable();

            $table->unique(['rrppe_no', 'property_no'], 'uq_rrppe_pk');
        });

        Schema::dropIfExists('rrppe_items');
    }
};
