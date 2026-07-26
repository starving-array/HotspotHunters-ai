package com.ksp.intelligence.actuator;

import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.ListConsumerGroupOffsetsSpec;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Component
@Endpoint(id = "kafkaLag")
public class KafkaLagEndpoint {

    private static final Logger log = LoggerFactory.getLogger(KafkaLagEndpoint.class);

    private final String bootstrapServers;

    public KafkaLagEndpoint(@Value("${spring.kafka.bootstrap-servers}") String bootstrapServers) {
        this.bootstrapServers = bootstrapServers;
    }

    @ReadOperation
    public List<ConsumerGroupLag> lag() {
        List<ConsumerGroupLag> result = new ArrayList<>();
        Map<String, Object> props = Map.of(
                org.apache.kafka.clients.admin.AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers
        );

        try (AdminClient admin = AdminClient.create(props)) {
            var groupIds = admin.listConsumerGroups().valid().get().stream()
                    .map(g -> g.groupId())
                    .toList();

            for (String groupId : groupIds) {
                var offsetsSpec = new ListConsumerGroupOffsetsSpec();
                // groupId set via the deprecated constructor path — use per-group query
                Map<String, ListConsumerGroupOffsetsSpec> specs = Map.of(groupId, offsetsSpec);
                var offsetsFuture = admin.listConsumerGroupOffsets(specs);
                Map<TopicPartition, OffsetAndMetadata> offsets = offsetsFuture.partitionsToOffsetAndMetadata().get();

                if (offsets.isEmpty()) continue;

                Map<TopicPartition, OffsetSpec> endOffsetsReq = new HashMap<>();
                for (TopicPartition tp : offsets.keySet()) {
                    endOffsetsReq.put(tp, OffsetSpec.latest());
                }
                var endOffsets = admin.listOffsets(endOffsetsReq).all().get();

                long totalLag = 0;
                List<PartitionLag> partitions = new ArrayList<>();
                for (var entry : offsets.entrySet()) {
                    TopicPartition tp = entry.getKey();
                    long committed = entry.getValue().offset();
                    long end = endOffsets.get(tp).offset();
                    long lag = Math.max(0, end - committed);
                    totalLag += lag;
                    partitions.add(new PartitionLag(tp.topic(), tp.partition(), committed, end, lag));
                }

                String consumerState = "stable";
                try {
                    var desc = admin.describeConsumerGroups(List.of(groupId));
                    var descResult = desc.all().get().get(groupId);
                    if (descResult != null) {
                        consumerState = descResult.state().toString();
                    }
                } catch (Exception e) {
                    consumerState = "unknown";
                }

                result.add(new ConsumerGroupLag(groupId, totalLag, consumerState, partitions));
            }
        } catch (ExecutionException | InterruptedException e) {
            log.warn("Failed to query Kafka consumer lag: {}", e.getMessage());
            Thread.currentThread().interrupt();
        }

        return result;
    }

    public record ConsumerGroupLag(String groupId, long totalLag, String state, List<PartitionLag> partitions) {}
    public record PartitionLag(String topic, int partition, long committedOffset, long endOffset, long lag) {}
}
