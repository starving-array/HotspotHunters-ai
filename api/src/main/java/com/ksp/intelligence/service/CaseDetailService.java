package com.ksp.intelligence.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ksp.intelligence.dto.CaseDetailDto;
import com.ksp.intelligence.dto.CaseIndicatorDto;
import com.ksp.intelligence.dto.RelatedCaseDto;
import com.ksp.intelligence.dto.TimelineEventDto;
import com.ksp.intelligence.model.CyberIndicator;
import com.ksp.intelligence.repository.CaseMasterRepository;
import com.ksp.intelligence.repository.ChargesheetDetailsRepository;
import com.ksp.intelligence.repository.CyberIndicatorRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CaseDetailService {

    private static final Logger log = LoggerFactory.getLogger(CaseDetailService.class);
    private static final String REDIS_PREFIX = "case:detail:";
    private static final Duration CACHE_TTL = Duration.ofHours(12);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final EntityManager em;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final CaseMasterRepository caseMasterRepo;
    private final CyberIndicatorRepository indicatorRepo;
    private final ChargesheetDetailsRepository chargesheetRepo;

    public CaseDetailService(EntityManager em,
                             StringRedisTemplate redis,
                             ObjectMapper objectMapper,
                             CaseMasterRepository caseMasterRepo,
                             CyberIndicatorRepository indicatorRepo,
                             ChargesheetDetailsRepository chargesheetRepo) {
        this.em = em;
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.caseMasterRepo = caseMasterRepo;
        this.indicatorRepo = indicatorRepo;
        this.chargesheetRepo = chargesheetRepo;
    }

    public Optional<CaseDetailDto> getCaseDetail(int caseMasterId) {
        String cacheKey = REDIS_PREFIX + caseMasterId;

        String cached = redis.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return Optional.of(objectMapper.readValue(cached, CaseDetailDto.class));
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialize cached case detail for {}", caseMasterId, e);
            }
        }

        Optional<CaseDetailDto> result = fetchFromDatabase(caseMasterId);
        if (result.isPresent()) {
            try {
                redis.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result.get()), CACHE_TTL);
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize case detail for caching {}", caseMasterId, e);
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private Optional<CaseDetailDto> fetchFromDatabase(int caseMasterId) {
        String sql = """
            SELECT
                cm.casemasterid,
                cm.crimeno,
                cm.caseno,
                cm.crimeregistereddate,
                COALESCE(cc.lookupvalue, '') AS casecategory,
                COALESCE(go.lookupvalue, '') AS gravityoffence,
                COALESCE(ch.crimegroupname, '') AS crimemajorhead,
                COALESCE(csh.crimeheadname, '') AS crimeminorhead,
                COALESCE(csm.casestatusname, '') AS casestatusname,
                COALESCE(ct.courtname, '') AS courtname,
                COALESCE(d.districtname, '') AS districtname,
                COALESCE(u.stationname, '') AS policestationname,
                COALESCE(e.firstname, '') AS policepersonname,
                cm.incidentfromdate,
                cm.incidenttodate,
                cm.inforeceivedpsdate,
                cm.latitude,
                cm.longitude,
                cm.brieffacts,
                COALESCE(cd.complainantname, '') AS complainantname,
                COALESCE(a.name, '') AS suspectname,
                COALESCE(v.victimname, '') AS victimname,
                cm.is_cybercrime,
                COALESCE(cm.primary_platform, '') AS primary_platform,
                COALESCE(cm.financial_loss, 0) AS financial_loss,
                COALESCE(cm.cyber_severity, 'medium') AS cyber_severity
            FROM casemaster cm
            LEFT JOIN unit u ON u.unitid = cm.policestationid
            LEFT JOIN district d ON d.districtid = u.districtid
            LEFT JOIN casestatusmaster csm ON csm.casestatusid = cm.casestatusid
            LEFT JOIN crimehead ch ON ch.crimeheadid = cm.crimemajorheadid
            LEFT JOIN crimesubhead csh ON csh.crimesubheadid = cm.crimeminorheadid
            LEFT JOIN court ct ON ct.courtid = cm.courtid
            LEFT JOIN employee e ON e.employeeid = cm.policepersonid
            LEFT JOIN casecategory cc ON cc.casecategoryid = cm.casecategoryid
            LEFT JOIN gravityoffence go ON go.gravityoffenceid = cm.gravityoffenceid
            LEFT JOIN complainantdetails cd ON cd.casemasterid = cm.casemasterid
            LEFT JOIN accused a ON a.casemasterid = cm.casemasterid
            LEFT JOIN victim v ON v.casemasterid = cm.casemasterid
            WHERE cm.casemasterid = ?1
            """;

        Query query = em.createNativeQuery(sql);
        query.setParameter(1, caseMasterId);
        List<Object[]> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = rows.get(0);

        CaseDetailDto dto = new CaseDetailDto();
        dto.setCaseMasterId(toInt(row[0]));
        dto.setCrimeNo(toString(row[1]));
        dto.setCaseNo(toString(row[2]));
        dto.setCrimeRegisteredDate(toDateString(row[3]));
        dto.setCaseCategory(toString(row[4]));
        dto.setGravityOffence(toString(row[5]));
        dto.setCrimeMajorHead(toString(row[6]));
        dto.setCrimeMinorHead(toString(row[7]));
        dto.setCaseStatusName(toString(row[8]));
        dto.setCourtName(toString(row[9]));
        dto.setDistrictName(toString(row[10]));
        dto.setPoliceStationName(toString(row[11]));
        dto.setPolicePersonName(toString(row[12]));
        dto.setIncidentFromDate(toDateTimeString(row[13]));
        dto.setIncidentToDate(toDateTimeString(row[14]));
        dto.setInfoReceivedPSDate(toDateTimeString(row[15]));
        dto.setLatitude(toDouble(row[16]));
        dto.setLongitude(toDouble(row[17]));
        dto.setBriefFacts(toString(row[18]));
        dto.setComplainantName(toString(row[19]));
        dto.setSuspectName(toString(row[20]));
        dto.setVictimName(toString(row[21]));
        dto.setCybercrime(toBool(row[22]));
        dto.setPrimaryPlatform(toString(row[23]));
        dto.setFinancialLoss(toDouble(row[24]));
        dto.setCyberSeverity(toString(row[25]));

        dto.setIndicators(fetchIndicators(caseMasterId));

        dto.setChargesheetDate("");
        dto.setChargesheetType("");
        chargesheetRepo.findByCaseMasterID(caseMasterId).stream().findFirst().ifPresent(cs -> {
            if (cs.getCsdate() != null) {
                dto.setChargesheetDate(cs.getCsdate().toString());
            }
            if (cs.getCstype() != null) {
                dto.setChargesheetType(cs.getCstype().name());
            }
        });

        dto.setTimeline(buildTimeline(dto));
        dto.setRelatedCases(fetchRelatedCases(caseMasterId, dto.getCrimeMajorHead()));
        dto.setLastUpdated(dto.getCrimeRegisteredDate());

        return Optional.of(dto);
    }

    private List<CaseIndicatorDto> fetchIndicators(int caseMasterId) {
        List<CyberIndicator> indicators = indicatorRepo.findByCasemasterId(caseMasterId);
        return indicators.stream().map(i -> CaseIndicatorDto.builder()
                .indicatorType(i.getIndicatorType() != null ? i.getIndicatorType().name() : "")
                .indicatorValue(i.getIndicatorValue() != null ? i.getIndicatorValue() : "")
                .platform(i.getPlatform() != null ? i.getPlatform() : "")
                .firstSeen(i.getFirstSeen() != null ? i.getFirstSeen().toString() : "")
                .lastSeen(i.getLastSeen() != null ? i.getLastSeen().toString() : "")
                .isActive(i.getIsActive() != null ? i.getIsActive() : false)
                .build()).collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private List<RelatedCaseDto> fetchRelatedCases(int caseMasterId, String crimeMajorHead) {
        if (crimeMajorHead == null || crimeMajorHead.isEmpty()) return List.of();
        String sql = """
            SELECT cm.casemasterid, cm.crimeno, d.districtname, csm.casestatusname
            FROM casemaster cm
            LEFT JOIN unit u ON u.unitid = cm.policestationid
            LEFT JOIN district d ON d.districtid = u.districtid
            LEFT JOIN casestatusmaster csm ON csm.casestatusid = cm.casestatusid
            LEFT JOIN crimehead ch ON ch.crimeheadid = cm.crimemajorheadid
            WHERE ch.crimegroupname = ?1 AND cm.casemasterid <> ?2
            ORDER BY cm.crimeregistereddate DESC
            LIMIT 10
            """;
        Query query = em.createNativeQuery(sql);
        query.setParameter(1, crimeMajorHead);
        query.setParameter(2, caseMasterId);
        List<Object[]> rows = query.getResultList();
        List<RelatedCaseDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(RelatedCaseDto.builder()
                    .caseMasterId(toInt(row[0]))
                    .crimeNo(toString(row[1]))
                    .districtName(toString(row[2]))
                    .status(toString(row[3]))
                    .crimeMajorHead(crimeMajorHead)
                    .build());
        }
        return result;
    }

    private List<TimelineEventDto> buildTimeline(CaseDetailDto dto) {
        List<TimelineEventDto> events = new ArrayList<>();

        if (dto.getCrimeRegisteredDate() != null && !dto.getCrimeRegisteredDate().isEmpty()) {
            events.add(TimelineEventDto.builder()
                    .date(dto.getCrimeRegisteredDate())
                    .action("FIR Registered")
                    .actor("System")
                    .description("Case registered at " + dto.getPoliceStationName())
                    .build());
        }

        if (dto.getInfoReceivedPSDate() != null && !dto.getInfoReceivedPSDate().isEmpty()) {
            events.add(TimelineEventDto.builder()
                    .date(dto.getInfoReceivedPSDate())
                    .action("Information Received at PS")
                    .actor("System")
                    .description("Police station notified about the incident")
                    .build());
        }

        if (dto.getChargesheetDate() != null && !dto.getChargesheetDate().isEmpty()) {
            events.add(TimelineEventDto.builder()
                    .date(dto.getChargesheetDate())
                    .action("Charge Sheet Filed")
                    .actor(dto.getPolicePersonName())
                    .description("Type: " + dto.getChargesheetType())
                    .build());
        }

        events.add(TimelineEventDto.builder()
                .date(dto.getLastUpdated())
                .action("Current Status: " + dto.getCaseStatusName())
                .actor("System")
                .description("")
                .build());

        return events;
    }

    private int toInt(Object o) {
        if (o == null) return 0;
        if (o instanceof Number) return ((Number) o).intValue();
        try { return Integer.parseInt(o.toString()); } catch (Exception e) { return 0; }
    }

    private double toDouble(Object o) {
        if (o == null) return 0.0;
        if (o instanceof Number) return ((Number) o).doubleValue();
        try { return Double.parseDouble(o.toString()); } catch (Exception e) { return 0.0; }
    }

    private boolean toBool(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean) return (Boolean) o;
        return "true".equalsIgnoreCase(o.toString()) || "1".equals(o.toString());
    }

    private String toString(Object o) {
        return o == null ? "" : o.toString();
    }

    private String toDateString(Object o) {
        if (o == null) return "";
        if (o instanceof java.sql.Date) return ((java.sql.Date) o).toLocalDate().toString();
        if (o instanceof LocalDate) return ((LocalDate) o).toString();
        return o.toString();
    }

    private String toDateTimeString(Object o) {
        if (o == null) return "";
        if (o instanceof java.sql.Timestamp) return ((java.sql.Timestamp) o).toLocalDateTime().toString();
        if (o instanceof java.sql.Date) return ((java.sql.Date) o).toLocalDate().toString();
        return o.toString();
    }
}
