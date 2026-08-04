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
        Schema::create('rrsp_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rrsp_monitoring_id')->constrained('rrsp_monitoring')->onDelete('cascade');
            $table->text('item_description');
            $table->integer('quantity');
            $table->string('property_no', 50)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('status', 50)->nullable();
            $table->string('kind_of_semi_expendable', 50)->nullable();
            $table->string('area', 100)->nullable();
            $table->timestamps();
        });

        // Migrate existing data
        $rrspRecords = \Illuminate\Support\Facades\DB::table('rrsp_monitoring')->get();
        foreach ($rrspRecords as $record) {
            \Illuminate\Support\Facades\DB::table('rrsp_items')->insert([
                'rrsp_monitoring_id' => $record->id,
                'item_description' => $record->item_description,
                'quantity' => $record->quantity,
                'property_no' => $record->property_no,
                'cost' => $record->cost,
                'status' => $record->status,
                'kind_of_semi_expendable' => $record->kind_of_semi_expendable,
                'area' => $record->area,
                'created_at' => $record->created_at,
                'updated_at' => $record->updated_at,
            ]);
        }

        // Drop the columns from rrsp_monitoring
        Schema::table('rrsp_monitoring', function (Blueprint $table) {
            $table->dropColumn([
                'item_description',
                'quantity',
                'property_no',
                'cost',
                'status',
                'kind_of_semi_expendable',
                'area'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rrsp_monitoring', function (Blueprint $table) {
            $table->text('item_description')->nullable();
            $table->integer('quantity')->default(1);
            $table->string('property_no', 50)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('status', 50)->nullable();
            $table->string('kind_of_semi_expendable', 50)->nullable();
            $table->string('area', 100)->nullable();
        });

        $items = \Illuminate\Support\Facades\DB::table('rrsp_items')->get();
        foreach ($items as $item) {
            // Just map back the first item to avoid overriding or losing data entirely.
            // In a real rollback of 1-to-many to 1-to-1, data loss is inevitable.
            \Illuminate\Support\Facades\DB::table('rrsp_monitoring')
                ->where('id', $item->rrsp_monitoring_id)
                ->update([
                    'item_description' => $item->item_description,
                    'quantity' => $item->quantity,
                    'property_no' => $item->property_no,
                    'cost' => $item->cost,
                    'status' => $item->status,
                    'kind_of_semi_expendable' => $item->kind_of_semi_expendable,
                    'area' => $item->area,
                ]);
        }

        Schema::dropIfExists('rrsp_items');
    }
};
